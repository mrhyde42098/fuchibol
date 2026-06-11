import { env } from '../config/env.js';
import { profileForUrl } from '../config/upstream-profiles.js';
import { AppError } from '../errors/app-error.js';
import { resolveLa18hdManifest } from '../scrapers/la18hd.scraper.js';
import { resolveStreamXhdManifest } from '../scrapers/pelota-libre.scraper.js';
import { resolveTvtvhdManifest } from '../scrapers/tvtvhd.scraper.js';
import { decodeBase64Url, slugFromStreamParam } from '../scrapers/base.scraper.js';
import { findChannelById } from './catalog.service.js';
import { pickHighestQualityManifest } from '../proxy/hls-quality.service.js';
import { buildProxyUrl } from './token.service.js';
import { logger } from '../utils/logger.js';

interface ResolvedStream {
  manifestUrl: string;
  proxyUrl: string;
  expiresInMs: number;
}

const resolveCache = new Map<string, { url: string; exp: number }>();

function getCachedManifest(channelId: string): string | null {
  const entry = resolveCache.get(channelId);
  if (!entry) return null;
  if (Date.now() > entry.exp) {
    resolveCache.delete(channelId);
    return null;
  }
  return entry.url;
}

function setCachedManifest(channelId: string, url: string): void {
  resolveCache.set(channelId, {
    url,
    exp: Date.now() + env.streamResolveCacheMs,
  });
}

function extractSlugFromPelotaUrl(channelId: string): string | null {
  if (!channelId.includes('pelotalibre')) return null;
  const match = channelId.match(/[?&]r=([^&]+)/);
  if (!match) return null;
  const decoded = decodeBase64Url(match[1]);
  return slugFromStreamParam(decoded);
}

async function resolveUpstreamM3u8(channelId: string): Promise<string> {
  const cached = getCachedManifest(channelId);
  if (cached) return cached;

  let m3u8: string;

  if (channelId.startsWith('premium-v2-')) {
    m3u8 = await resolveLa18hdManifest(channelId);
  } else if (channelId.startsWith('tvtvhd-')) {
    m3u8 = await resolveTvtvhdManifest(channelId);
  } else {
    const slug =
      extractSlugFromPelotaUrl(channelId) ||
      (channelId.includes('stream-xhd') ? slugFromStreamParam(channelId) : null) ||
      channelId;

    m3u8 = await resolveStreamXhdManifest(slug);
  }

  m3u8 = await pickHighestQualityManifest(m3u8);

  setCachedManifest(channelId, m3u8);
  return m3u8;
}

function candidateIdsForChannel(channelId: string): string[] {
  const channel = findChannelById(channelId);
  const ids: string[] = [];

  const push = (id: string | undefined) => {
    if (!id || ids.includes(id)) return;
    ids.push(id);
  };

  push(channel?.id);
  push(channelId);

  for (const backup of channel?.backups ?? []) {
    const slug = extractSlugFromPelotaUrl(backup);
    push(slug ?? backup);
  }

  return ids;
}

export async function resolveStreamForChannel(channelId: string): Promise<ResolvedStream> {
  const channel = findChannelById(channelId);

  if (
    !channel &&
    !channelId.startsWith('premium-v2-') &&
    !channelId.startsWith('tvtvhd-') &&
    !channelId.includes('pelotalibre')
  ) {
    const bySlug = findChannelById(channelId.toLowerCase());
    if (!bySlug) {
      throw new AppError('CHANNEL_NOT_FOUND', `Canal no encontrado: ${channelId}`, 404);
    }
  }

  const candidates = candidateIdsForChannel(channelId);
  let lastError: unknown;

  for (const candidateId of candidates) {
    try {
      const manifestUrl = await resolveUpstreamM3u8(candidateId);
      const { key } = profileForUrl(manifestUrl);
      const proxyUrl = buildProxyUrl('manifest', manifestUrl, key);

      if (candidateId !== channelId && candidateId !== channel?.id) {
        logger.info({ channelId, candidateId }, 'Stream resolved via backup');
      }

      return {
        manifestUrl,
        proxyUrl,
        expiresInMs: env.tokenTtlMs,
      };
    } catch (err) {
      lastError = err;
      logger.debug({ err, channelId, candidateId }, 'Stream candidate failed');
    }
  }

  logger.warn({ err: lastError, channelId }, 'Stream resolution failed');
  throw new AppError(
    'STREAM_UNAVAILABLE',
    lastError instanceof Error ? lastError.message : 'No se pudo resolver el manifiesto HLS',
    502,
  );
}
