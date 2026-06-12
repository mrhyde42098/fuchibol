import { env } from '../config/env.js';
import { agendaCache, channelsCache } from './catalog.service.js';
import { resolveStreamForChannel } from './stream-resolver.service.js';
import type { ChannelAudit } from '../types/channel.js';
import { probeManifestSignal, type SignalKind } from './signal-probe.service.js';
import { logger } from '../utils/logger.js';

const auditStore = new Map<string, ChannelAudit>();
let priorityTimer: ReturnType<typeof setInterval> | null = null;
let backgroundTimer: ReturnType<typeof setInterval> | null = null;
let auditRunning = false;
let backgroundCursor = 0;

const POPULAR_CHANNEL_IDS = new Set([
  'espn',
  'espn2',
  'espn3',
  'espnar',
  'espndeportes',
  'premium-v2-dsports',
  'premium-v2-foxsports',
  'premium-v2-tycsports',
  'premium-v2-tntsports',
  'premium-v2-winsports',
  'premium-v2-winsports2',
  'tvtvhd-winsports2',
  'tycsports',
  'dsportsar',
  'disney1',
  'foxsports',
  'tvtvhd-espn',
]);

function isLiveAgendaStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s.includes('VIVO') || s.includes('LIVE') || s.includes('EN CURSO');
}

function getAgendaLiveChannelIds(): Set<string> {
  const ids = new Set<string>();
  const { data: agenda } = agendaCache.get();

  for (const ev of agenda) {
    if (!isLiveAgendaStatus(ev.status)) continue;
    if (ev.channelId) ids.add(ev.channelId);
    ev.channels?.forEach((c) => ids.add(c.channelId));
  }

  return ids;
}

function buildPriorityIds(allIds: string[]): string[] {
  const liveAgenda = getAgendaLiveChannelIds();
  const priority = allIds.filter(
    (id) =>
      liveAgenda.has(id) ||
      POPULAR_CHANNEL_IDS.has(id) ||
      /win.?sport|winsport/i.test(id),
  );
  return [...new Set(priority)];
}

function deriveStatus(
  signal: SignalKind,
  latencyMs: number,
  failCount: number,
): ChannelAudit['status'] {
  if (signal === 'offline') {
    return failCount >= env.streamAuditFailThreshold ? 'unavailable' : 'degraded';
  }
  if (signal === 'standby') return 'degraded';
  if (latencyMs > env.streamAuditDegradedMs) return 'degraded';
  return 'ok';
}

function shouldSkipAudit(channelId: string): boolean {
  const prev = auditStore.get(channelId);
  if (!prev || prev.failCount < env.streamAuditFailThreshold) return false;
  const age = Date.now() - new Date(prev.lastChecked).getTime();
  return age < env.streamAuditBackoffMs;
}

async function auditChannel(channelId: string): Promise<ChannelAudit> {
  const prev = auditStore.get(channelId);
  if (shouldSkipAudit(channelId) && prev) return prev;

  const start = Date.now();

  try {
    const { manifestUrl } = await resolveStreamForChannel(channelId);
    const { signal, isHd } = await probeManifestSignal(manifestUrl);
    const latencyMs = Date.now() - start;

    if (signal === 'offline') {
      throw new Error('Sin manifiesto HLS válido');
    }

    return {
      status: deriveStatus(signal, latencyMs, 0),
      signal,
      latencyMs,
      isHd,
      lastChecked: new Date().toISOString(),
      failCount: 0,
    };
  } catch {
    const failCount = (prev?.failCount ?? 0) + 1;
    const signal: SignalKind = 'offline';

    return {
      status: deriveStatus(signal, 0, failCount),
      signal,
      latencyMs: null,
      isHd: prev?.isHd ?? false,
      lastChecked: new Date().toISOString(),
      failCount,
    };
  }
}

async function runAuditBatch(channelIds: string[]): Promise<void> {
  if (channelIds.length === 0) return;

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
          signal: 'offline',
          latencyMs: null,
          isHd: prev?.isHd ?? false,
          lastChecked: new Date().toISOString(),
          failCount: (prev?.failCount ?? 0) + 1,
        });
      }
    });
  }
}

async function runPriorityAudit(): Promise<void> {
  if (auditRunning) return;
  auditRunning = true;

  try {
    const { data: channels } = channelsCache.get();
    const allIds = channels.map((c) => c.id);
    const ids = buildPriorityIds(allIds);
    logger.info({ count: ids.length }, 'Priority stream audit started');
    await runAuditBatch(ids);
    logger.info({ audited: auditStore.size }, 'Priority stream audit completed');
  } catch (err) {
    logger.warn({ err }, 'Priority stream audit failed');
  } finally {
    auditRunning = false;
  }
}

async function runBackgroundAuditSlice(): Promise<void> {
  if (auditRunning) return;

  try {
    const { data: channels } = channelsCache.get();
    const allIds = channels.map((c) => c.id).filter((id) => !shouldSkipAudit(id));
    if (allIds.length === 0) return;

    const batch: string[] = [];
    const batchSize = env.streamAuditBackgroundBatch;

    for (let i = 0; i < batchSize; i++) {
      batch.push(allIds[(backgroundCursor + i) % allIds.length]);
    }
    backgroundCursor = (backgroundCursor + batchSize) % allIds.length;

    logger.info({ batch: batch.length, cursor: backgroundCursor }, 'Background audit slice');
    await runAuditBatch(batch);
  } catch (err) {
    logger.warn({ err }, 'Background stream audit failed');
  }
}

export function getChannelAudit(channelId: string): ChannelAudit | undefined {
  return auditStore.get(channelId);
}

export function getAllAudits(): Map<string, ChannelAudit> {
  return auditStore;
}

export function channelSortScore(audit?: ChannelAudit): number {
  if (!audit) return 5;

  if (audit.signal === 'offline' || audit.status === 'unavailable') return 0;
  if (audit.signal === 'standby') return 22;
  if (audit.signal === 'unknown') return 12;

  if (audit.status === 'degraded') return 38;

  const hdBonus = audit.isHd ? 20 : 0;
  const latencyBonus =
    audit.latencyMs != null ? Math.max(0, 20 - Math.floor(audit.latencyMs / 200)) : 0;
  return 70 + hdBonus + latencyBonus;
}

export function isAuditStale(audit: ChannelAudit | undefined, maxAgeMs: number): boolean {
  if (!audit?.lastChecked) return true;
  return Date.now() - new Date(audit.lastChecked).getTime() > maxAgeMs;
}

export async function auditChannelNow(channelId: string): Promise<ChannelAudit> {
  const audit = await auditChannel(channelId);
  auditStore.set(channelId, audit);
  return audit;
}

export async function startStreamAuditor(): Promise<void> {
  if (!env.streamAuditEnabled) {
    logger.info('Stream auditor disabled');
    return;
  }

  void runPriorityAudit();

  priorityTimer = setInterval(() => {
    void runPriorityAudit();
  }, env.streamAuditPriorityIntervalMs);

  backgroundTimer = setInterval(() => {
    void runBackgroundAuditSlice();
  }, env.streamAuditBackgroundIntervalMs);
}

export function stopStreamAuditor(): void {
  if (priorityTimer) {
    clearInterval(priorityTimer);
    priorityTimer = null;
  }
  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }
}

export function getAuditorHealth() {
  const audits = Array.from(auditStore.values());
  return {
    enabled: env.streamAuditEnabled,
    running: auditRunning,
    total: auditStore.size,
    live: audits.filter((a) => a.signal === 'live').length,
    standby: audits.filter((a) => a.signal === 'standby').length,
    offline: audits.filter((a) => a.signal === 'offline').length,
    ok: audits.filter((a) => a.status === 'ok').length,
    degraded: audits.filter((a) => a.status === 'degraded').length,
    unavailable: audits.filter((a) => a.status === 'unavailable').length,
    priorityIntervalMs: env.streamAuditPriorityIntervalMs,
    backgroundIntervalMs: env.streamAuditBackgroundIntervalMs,
    backgroundBatch: env.streamAuditBackgroundBatch,
  };
}
