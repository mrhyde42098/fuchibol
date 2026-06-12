import { env } from '../config/env.js';
import { profileByKey, profileForUrl, type ProfileKey } from '../config/upstream-profiles.js';
import { AppError } from '../errors/app-error.js';
import { resolveLa18hdManifest } from '../scrapers/la18hd.scraper.js';
import {
  latamvidzTargetsForChannel,
  parseLatamvidzBackup,
  resolveLatamvidzManifest,
} from '../scrapers/latamvidz.scraper.js';
import { resolveStreamXhdManifest } from '../scrapers/pelota-libre.scraper.js';
import { resolveTvtvhdManifest } from '../scrapers/tvtvhd.scraper.js';
import { decodeBase64Url, slugFromStreamParam } from '../scrapers/base.scraper.js';
import { findChannelById } from './catalog.service.js';
import { pickHighestQualityManifest } from '../proxy/hls-quality.service.js';
import { buildProxyUrl, type TokenHeaderOverrides } from './token.service.js';
import { getMirrorsForChannel, type StreamMirror } from './iptv-mirror.service.js';
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

function profileKeyForMirror(mirror: StreamMirror): ProfileKey {
  if (mirror.source === 'thetvapp' || mirror.url.includes('thetvapp')) return 'thetvapp';
  return profileForUrl(mirror.url).key;
}

function profileForMirror(mirror: StreamMirror) {
  const key = profileKeyForMirror(mirror);
  const base = profileByKey(key);
  return {
    key,
    profile: {
      origin: mirror.origin ?? base.origin,
      referer: mirror.referer ?? base.referer,
      userAgent: mirror.userAgent ?? base.userAgent,
    },
  };
}

function headerOverridesForMirror(mirror: StreamMirror): TokenHeaderOverrides {
  const { profile } = profileForMirror(mirror);
  return {
    referer: profile.referer,
    origin: profile.origin,
    userAgent: profile.userAgent,
  };
}

async function resolveDirectM3u8(manifestUrl: string, mirror?: StreamMirror): Promise<string> {
  const overrides = mirror ? headerOverridesForMirror(mirror) : undefined;
  return pickHighestQualityManifest(manifestUrl, 0, overrides);
}

async function tryLatamvidzManifest(channelId: string): Promise<string | null> {
  for (const target of latamvidzTargetsForChannel(channelId)) {
    try {
      const manifest = await resolveLatamvidzManifest(target);
      logger.info({ channelId, target }, 'Stream resolved via latamvidz (Futbol Libre)');
      return manifest;
    } catch (err) {
      logger.debug({ err, channelId, target }, 'latamvidz candidate failed');
    }
  }
  return null;
}

async function resolveUpstreamM3u8(channelId: string): Promise<string> {
  const cached = getCachedManifest(channelId);
  if (cached) return cached;

  let m3u8: string;

  const latamBackup = parseLatamvidzBackup(channelId);
  if (latamBackup) {
    m3u8 = await resolveLatamvidzManifest(latamBackup);
  } else if (channelId.startsWith('premium-v2-')) {
    const fromLatam = await tryLatamvidzManifest(channelId);
    m3u8 = fromLatam ?? (await resolveLa18hdManifest(channelId));
  } else if (channelId.startsWith('tvtvhd-')) {
    const fromLatam = await tryLatamvidzManifest(channelId);
    m3u8 = fromLatam ?? (await resolveTvtvhdManifest(channelId));
  } else {
    const slug =
      extractSlugFromPelotaUrl(channelId) ||
      (channelId.includes('stream-xhd') ? slugFromStreamParam(channelId) : null) ||
      channelId;

    const fromLatam = await tryLatamvidzManifest(channelId);
    m3u8 = fromLatam ?? (await resolveStreamXhdManifest(slug));
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
    if (parseLatamvidzBackup(backup)) {
      push(backup);
      continue;
    }
    const slug = extractSlugFromPelotaUrl(backup);
    push(slug ?? backup);
  }

  return ids;
}

async function resolveFromMirror(
  channelId: string,
  mirror: StreamMirror,
): Promise<ResolvedStream> {
  const manifestUrl = await resolveDirectM3u8(mirror.url, mirror);
  const { key } = profileForMirror(mirror);
  const proxyUrl = buildProxyUrl('manifest', manifestUrl, key, headerOverridesForMirror(mirror));

  logger.info(
    { channelId, source: mirror.source, label: mirror.label },
    'Stream resolved via IPTV mirror',
  );

  return {
    manifestUrl,
    proxyUrl,
    expiresInMs: env.tokenTtlMs,
  };
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

  const mirrors = await getMirrorsForChannel(channelId, channel?.name);
  for (const mirror of mirrors) {
    try {
      return await resolveFromMirror(channelId, mirror);
    } catch (err) {
      lastError = err;
      logger.debug({ err, channelId, mirror: mirror.label }, 'IPTV mirror failed');
    }
  }

  logger.warn({ err: lastError, channelId }, 'Stream resolution failed');
  throw new AppError(
    'STREAM_UNAVAILABLE',
    'No hay señal disponible para este canal en este momento. Prueba otro canal o espera unos segundos.',
    502,
  );
}
