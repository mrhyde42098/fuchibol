import { env } from '../config/env.js';
import { channelsCache } from './catalog.service.js';
import { resolveStreamForChannel } from './stream-resolver.service.js';
import type { ChannelAudit } from '../types/channel.js';
import { logger } from '../utils/logger.js';

const auditStore = new Map<string, ChannelAudit>();
let auditTimer: ReturnType<typeof setInterval> | null = null;
let auditRunning = false;

const M3U8_MARKERS = ['#EXTM3U', '#EXT-X-STREAM-INF', '#EXTINF'];

function detectHd(manifestBody: string): boolean {
  const lower = manifestBody.toLowerCase();
  return (
    lower.includes('1080') ||
    lower.includes('720') ||
    lower.includes('hd') ||
    lower.includes('high')
  );
}

function isValidM3u8(body: string, contentType: string | null): boolean {
  if (contentType?.includes('mpegurl') || contentType?.includes('m3u8')) return true;
  return M3U8_MARKERS.some((m) => body.includes(m));
}

async function auditChannel(channelId: string): Promise<ChannelAudit> {
  const prev = auditStore.get(channelId);
  const start = Date.now();

  try {
    const { proxyUrl } = await resolveStreamForChannel(channelId);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.streamAuditTimeoutMs);

    const res = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/vnd.apple.mpegurl,*/*' },
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    const contentType = res.headers.get('content-type');
    const body = await res.text();

    if (!res.ok || !isValidM3u8(body, contentType)) {
      throw new Error(`Manifest inválido (${res.status})`);
    }

    const isHd = detectHd(body);
    const status: ChannelAudit['status'] =
      latencyMs > env.streamAuditDegradedMs ? 'degraded' : 'ok';

    return {
      status,
      latencyMs,
      isHd,
      lastChecked: new Date().toISOString(),
      failCount: 0,
    };
  } catch {
    const failCount = (prev?.failCount ?? 0) + 1;
    const status: ChannelAudit['status'] =
      failCount >= env.streamAuditFailThreshold ? 'unavailable' : 'degraded';

    return {
      status,
      latencyMs: null,
      isHd: prev?.isHd ?? false,
      lastChecked: new Date().toISOString(),
      failCount,
    };
  }
}

async function runAuditBatch(channelIds: string[]): Promise<void> {
  for (let i = 0; i < channelIds.length; i += env.streamAuditConcurrency) {
    const batch = channelIds.slice(i, i + env.streamAuditConcurrency);
    const results = await Promise.allSettled(batch.map((id) => auditChannel(id)));

    results.forEach((result, idx) => {
      const id = batch[idx];
      if (result.status === 'fulfilled') {
        auditStore.set(id, result.value);
      } else {
        const prev = auditStore.get(id);
        auditStore.set(id, {
          status: 'unavailable',
          latencyMs: null,
          isHd: prev?.isHd ?? false,
          lastChecked: new Date().toISOString(),
          failCount: (prev?.failCount ?? 0) + 1,
        });
      }
    });
  }
}

async function runFullAudit(): Promise<void> {
  if (auditRunning) return;
  auditRunning = true;

  try {
    const { data: channels } = channelsCache.get();
    const ids = channels.map((c) => c.id);
    logger.info({ count: ids.length }, 'Stream audit started');
    await runAuditBatch(ids);
    logger.info({ audited: auditStore.size }, 'Stream audit completed');
  } catch (err) {
    logger.warn({ err }, 'Stream audit failed');
  } finally {
    auditRunning = false;
  }
}

export function getChannelAudit(channelId: string): ChannelAudit | undefined {
  return auditStore.get(channelId);
}

export function getAllAudits(): Map<string, ChannelAudit> {
  return auditStore;
}

export function channelSortScore(audit?: ChannelAudit): number {
  if (!audit) return 50;
  if (audit.status === 'unavailable') return 0;
  if (audit.status === 'degraded') return 30;
  const hdBonus = audit.isHd ? 20 : 0;
  const latencyBonus = audit.latencyMs != null ? Math.max(0, 20 - Math.floor(audit.latencyMs / 200)) : 0;
  return 60 + hdBonus + latencyBonus;
}

export async function startStreamAuditor(): Promise<void> {
  if (!env.streamAuditEnabled) {
    logger.info('Stream auditor disabled');
    return;
  }

  void runFullAudit();

  auditTimer = setInterval(() => {
    void runFullAudit();
  }, env.streamAuditIntervalMs);
}

export function stopStreamAuditor(): void {
  if (auditTimer) {
    clearInterval(auditTimer);
    auditTimer = null;
  }
}

export function getAuditorHealth() {
  const audits = Array.from(auditStore.values());
  return {
    enabled: env.streamAuditEnabled,
    running: auditRunning,
    total: auditStore.size,
    ok: audits.filter((a) => a.status === 'ok').length,
    degraded: audits.filter((a) => a.status === 'degraded').length,
    unavailable: audits.filter((a) => a.status === 'unavailable').length,
    intervalMs: env.streamAuditIntervalMs,
  };
}
