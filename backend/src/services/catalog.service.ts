import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { MemoryCache } from '../cache/memory-cache.js';
import { scrapeLa18hdChannels } from '../scrapers/la18hd.scraper.js';
import { scrapePelotaLibreAgenda, scrapePelotaLibreChannels } from '../scrapers/pelota-libre.scraper.js';
import { scrapeTvtvhdChannels } from '../scrapers/tvtvhd.scraper.js';
import type { AgendaEvent } from '../types/agenda.js';
import type { PublicChannel, RawChannel } from '../types/channel.js';
import { logger } from '../utils/logger.js';
import { decodeBase64Url, slugFromStreamParam } from '../scrapers/base.scraper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
/** Repo root: Fuchibol/ (parent of backend/) */
const projectRoot = resolve(__dirname, '../../..');

function mapCategory(raw: RawChannel): string {
  if (raw.category === 'Premium') return 'Latam';
  if (raw.category === 'Premium 2') return 'Internacional';
  return raw.category || 'Canales';
}

function normalizeChannel(raw: RawChannel): PublicChannel {
  let id = raw.id;

  if (id.includes('pelotalibrestv.org') && id.includes('r=')) {
    const match = id.match(/[?&]r=([^&]+)/);
    if (match) {
      const decoded = decodeBase64Url(match[1]);
      const slug = slugFromStreamParam(decoded);
      if (slug) id = slug;
    }
  }

  return {
    id,
    name: raw.name,
    category: mapCategory(raw),
    logo: raw.logo ?? '',
    ...(raw.backups?.length ? { backups: raw.backups } : {}),
  };
}

async function loadFallbackChannels(): Promise<RawChannel[]> {
  const path = resolve(projectRoot, env.fallbackChannelsPath);
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as RawChannel[];
}

async function loadFallbackAgenda(): Promise<AgendaEvent[]> {
  const path = resolve(projectRoot, env.fallbackAgendaPath);
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as AgendaEvent[];
}

function mergeChannelsInto(target: Map<string, PublicChannel>, rawList: RawChannel[]): void {
  for (const ch of rawList) {
    const normalized = normalizeChannel(ch);
    target.set(normalized.id, normalized);
  }
}

async function loadChannels(): Promise<PublicChannel[]> {
  const merged = new Map<string, PublicChannel>();

  try {
    const fallback = await loadFallbackChannels();
    mergeChannelsInto(merged, fallback);
    logger.info({ count: fallback.length }, 'Seeded channels from fallback snapshot');
  } catch (err) {
    logger.warn({ err }, 'Fallback channels unavailable');
  }

  const results = await Promise.allSettled([
    scrapePelotaLibreChannels(),
    scrapeLa18hdChannels(),
    scrapeTvtvhdChannels(),
  ]);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      mergeChannelsInto(merged, result.value);
    } else {
      logger.warn({ err: result.reason }, 'Channel scraper failed');
    }
  }

  return Array.from(merged.values());
}

async function loadAgenda(): Promise<AgendaEvent[]> {
  try {
    const events = await scrapePelotaLibreAgenda();
    if (events.length > 0) return events;
  } catch (err) {
    logger.warn({ err }, 'Agenda scraper failed');
  }

  try {
    logger.warn('Loading fallback agenda.json');
    return await loadFallbackAgenda();
  } catch (err) {
    logger.warn({ err }, 'Fallback agenda unavailable');
    return [];
  }
}

export const channelsCache = new MemoryCache<PublicChannel[]>(
  'channels',
  env.cacheChannelsTtlMs,
  loadChannels
);

export const agendaCache = new MemoryCache<AgendaEvent[]>(
  'agenda',
  env.cacheAgendaTtlMs,
  loadAgenda
);

export function getChannels(): { data: PublicChannel[]; status: ReturnType<MemoryCache<PublicChannel[]>['get']>['status'] } {
  return channelsCache.get();
}

export function getAgenda(): { data: AgendaEvent[]; status: ReturnType<MemoryCache<AgendaEvent[]>['get']>['status'] } {
  return agendaCache.get();
}

export function findChannelById(id: string): PublicChannel | undefined {
  const { data } = channelsCache.get();
  return data.find((c) => c.id === id || c.id.toLowerCase() === id.toLowerCase());
}

export async function startCatalogCaches(): Promise<void> {
  await channelsCache.refresh(true);
  await agendaCache.refresh(true);
  channelsCache.start();
  agendaCache.start();
}

export function stopCatalogCaches(): void {
  channelsCache.stop();
  agendaCache.stop();
}

export function getCacheHealth() {
  return {
    channels: channelsCache.getMeta(),
    agenda: agendaCache.getMeta(),
  };
}
