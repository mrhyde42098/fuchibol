import { env } from '../config/env.js';
import { parseM3uPlaylist, type M3uEntry } from '../utils/m3u-parser.js';
import { logger } from '../utils/logger.js';

export interface StreamMirror {
  url: string;
  source: 'iptv-org' | 'thetvapp';
  label: string;
  referer?: string;
  origin?: string;
  userAgent?: string;
  score: number;
}

/** Fuentes públicas iptv-org + categoría Sports (322 canales deportivos curados) */
const DEFAULT_PLAYLISTS = [
  'https://iptv-org.github.io/iptv/categories/sports.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/co.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ar.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/mx.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/br.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/pe.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/cl.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ve.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/ec.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/us.m3u',
  'https://raw.githubusercontent.com/iptv-org/iptv/master/streams/es.m3u',
  'https://iptv-org.github.io/iptv/languages/spa.m3u',
];

/** Consultas por canal interno → patrones en nombres M3U (Champagne / iptv-org) */
const MIRROR_QUERIES: Record<string, string[]> = {
  espndeportes: ['espn deportes'],
  espn: ['espn'],
  espn2: ['espn 2'],
  espn2ar: ['espn 2', 'espn'],
  espn3: ['espn 3'],
  espn5: ['espn'],
  espnar: ['espn'],
  fs1usa: ['fox sports 1'],
  f2usa: ['fox sports 2'],
  foxsports: ['fox sports'],
  foxdeportes: ['fox deportes'],
  'premium-v2-winsports': ['win sports'],
  'premium-v2-winsports2': ['win+ futbol', 'win plus futbol', 'win sports'],
  'tvtvhd-winsports2': ['win sports'],
  tycsports: ['tyc sports'],
  'premium-v2-tycsports': ['tyc sports'],
  dsportsar: ['directv sports', 'dsports'],
  'premium-v2-dsports': ['dsports', 'directv sports'],
  'premium-v2-dsports2': ['dsports 2'],
  'premium-v2-foxsports': ['fox sports'],
  'premium-v2-foxsports2': ['fox sports 2'],
  telefe: ['telefe'],
  'premium-v2-telefe': ['telefe'],
  telemundo: ['telemundo'],
  sporttvbr1: ['sportv', 'spor tv'],
  'premium-v2-tntsports': ['tnt sports'],
  'tvtvhd-espn': ['espn'],
  'tvtvhd-foxsports': ['fox sports'],
  'tvtvhd-golperu': ['golperu', 'gol peru'],
  'tvtvhd-liga1max': ['liga1 max', 'liga 1 max'],
  'tvtvhd-sportv': ['sportv'],
  'tvtvhd-movistar': ['movistar deportes'],
  tudnmx: ['tudn'],
  'premium-v2-tudn_mx': ['tudn'],
  canal5mx: ['canal 5'],
  azteca7: ['azteca 7'],
  disney1: ['disney'],
  laligahypermotion: ['laliga', 'la liga'],
  'premium-v2-laligatvbar': ['laliga'],
  nba1: ['nba tv', 'nba'],
  mlb: ['mlb'],
  nhl: ['nhl'],
  'premium-v2-espnpremium': ['espn premium'],
  univision: ['univision'],
  unimas: ['uniMas', 'unimas'],
  vix: ['vix deportes'],
  paramount: ['paramount'],
  movistar: ['movistar'],
  evento5: ['caracol'],
  evento6: ['rcn deportes', 'deportes rcn'],
  golperu: ['golperu', 'gol peru'],
  'premium-v2-liga1max': ['liga1 max'],
};

const SPORTS_GROUP_HINTS = ['sport', 'deport', 'futbol', 'soccer', 'mlb', 'nba', 'nhl'];

let cache: { fetchedAt: number; entries: M3uEntry[] } | null = null;
let refreshTimer: ReturnType<typeof setInterval> | null = null;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9+\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function playlistUrls(): string[] {
  const custom = env.iptvMirrorPlaylistUrls.trim();
  if (custom) {
    return custom.split(',').map((u) => u.trim()).filter(Boolean);
  }
  return DEFAULT_PLAYLISTS;
}

async function fetchPlaylist(url: string): Promise<M3uEntry[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.iptvMirrorTimeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': env.defaultUserAgent },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    return parseM3uPlaylist(text);
  } finally {
    clearTimeout(timeout);
  }
}

function isPlayableHlsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes('.mpd') || lower.endsWith('.ts')) return false;
  return (
    lower.includes('.m3u8') ||
    lower.includes('.m3u') ||
    lower.includes('/hls/') ||
    lower.includes('/live/') ||
    lower.includes('/stream') ||
    /:\d+\/play\//.test(lower)
  );
}

function isGarbageEntry(entry: M3uEntry): boolean {
  const name = entry.name.toLowerCase();
  return (
    name.includes('like gecko') ||
    name.includes('group-title=') ||
    name.includes('#extinf') ||
    entry.name.length > 120
  );
}

function dedupeEntries(entries: M3uEntry[]): M3uEntry[] {
  const seen = new Set<string>();
  const out: M3uEntry[] = [];
  for (const entry of entries) {
    if (isGarbageEntry(entry)) continue;
    if (!isPlayableHlsUrl(entry.url)) continue;
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    out.push(entry);
  }
  return out;
}

async function loadMirrorIndex(): Promise<M3uEntry[]> {
  if (cache && Date.now() - cache.fetchedAt < env.iptvMirrorCacheMs) {
    return cache.entries;
  }

  const all: M3uEntry[] = [];
  for (const url of playlistUrls()) {
    try {
      const entries = await fetchPlaylist(url);
      all.push(...entries);
    } catch (err) {
      logger.warn({ err, url }, 'IPTV mirror playlist fetch failed');
    }
  }

  const deduped = dedupeEntries(all);
  cache = { fetchedAt: Date.now(), entries: deduped };
  logger.info({ raw: all.length, unique: deduped.length }, 'IPTV mirror index loaded');
  return deduped;
}

function scoreEntry(entry: M3uEntry, queries: string[]): number {
  const hay = normalize(`${entry.name} ${entry.tvgId ?? ''} ${entry.group ?? ''}`);
  const wantsDirectv = queries.some((q) => /directv|dsport/i.test(q));
  if (wantsDirectv && /\bdd sports\b/i.test(entry.name)) return 0;

  let queryScore = 0;

  for (const q of queries) {
    const nq = normalize(q);
    if (!nq) continue;
    if (hay === nq) queryScore = Math.max(queryScore, 100);
    else if (hay.includes(nq)) queryScore = Math.max(queryScore, 60);
    else if (nq.split(' ').every((w) => w.length > 2 && hay.includes(w))) {
      queryScore = Math.max(queryScore, 40);
    }
  }

  if (queryScore === 0) return 0;

  let score = queryScore;
  const label = `${entry.name} ${entry.tvgId ?? ''}`;
  if (entry.url.includes('thetvapp.to')) score += 25;
  if (entry.url.includes('amagi.tv') || entry.url.includes('cloudfront.net')) score += 22;
  if (entry.url.includes('akamaized.net') || entry.url.includes('latamlive.net')) score += 18;
  if (entry.url.includes('newkso.ru') || entry.url.includes('mono.m3u8')) score += 15;
  if (/\(1280p\)/i.test(label)) score += 28;
  else if (/\(1080p\)/i.test(label)) score += 24;
  else if (/\(720p\)/i.test(label)) score += 12;
  else if (/(1080|1280|720|hd)/i.test(label)) score += 8;
  if (/\[geo-blocked\]/i.test(entry.name)) score -= 25;
  if (/\[not 24\/7\]/i.test(entry.name)) score -= 8;
  if (/cors-proxy|jmp2\.uk/i.test(entry.url)) score -= 12;
  if (/:\d{4,5}\//.test(entry.url) && !entry.url.includes('thetvapp')) score -= 6;

  const group = normalize(entry.group ?? '');
  if (SPORTS_GROUP_HINTS.some((h) => group.includes(h) || hay.includes(h))) score += 10;

  return score;
}

function buildQueries(channelId: string, channelName?: string): string[] {
  const slug = channelId.replace(/^premium-v2-|^tvtvhd-/, '').replace(/_/g, ' ');
  const queries = new Set<string>();

  for (const q of MIRROR_QUERIES[channelId] ?? []) queries.add(q);
  for (const q of MIRROR_QUERIES[slug] ?? []) queries.add(q);

  if (channelName) queries.add(channelName);
  queries.add(slug);

  return [...queries].filter(Boolean);
}

function entryToMirror(entry: M3uEntry, score: number): StreamMirror {
  const source: StreamMirror['source'] = entry.url.includes('thetvapp.to')
    ? 'thetvapp'
    : 'iptv-org';

  return {
    url: entry.url,
    source,
    label: entry.name,
    referer: entry.referer,
    origin: entry.origin,
    userAgent: entry.userAgent,
    score,
  };
}

export async function getMirrorsForChannel(
  channelId: string,
  channelName?: string,
): Promise<StreamMirror[]> {
  if (!env.iptvMirrorEnabled) return [];

  const entries = await loadMirrorIndex();
  const queries = buildQueries(channelId, channelName);

  const scored = entries
    .map((entry) => ({ entry, score: scoreEntry(entry, queries) }))
    .filter(({ score }) => score >= 55)
    .sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const mirrors: StreamMirror[] = [];

  for (const { entry, score } of scored) {
    if (seen.has(entry.url)) continue;
    seen.add(entry.url);
    mirrors.push(entryToMirror(entry, score));
    if (mirrors.length >= env.iptvMirrorMaxPerChannel) break;
  }

  return mirrors;
}

export async function warmMirrorCache(): Promise<void> {
  if (!env.iptvMirrorEnabled) return;
  await loadMirrorIndex();
}

export function startMirrorRefreshScheduler(): void {
  if (!env.iptvMirrorEnabled || refreshTimer) return;
  const intervalMs = Math.max(env.iptvMirrorCacheMs / 2, 3_600_000);
  refreshTimer = setInterval(() => {
    cache = null;
    void warmMirrorCache().catch((err) => logger.warn({ err }, 'IPTV mirror scheduled refresh failed'));
  }, intervalMs);
  logger.info({ intervalMs }, 'IPTV mirror refresh scheduler started');
}

export function stopMirrorRefreshScheduler(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

export function getMirrorCacheMeta() {
  if (!cache) return { loaded: false, count: 0 };
  return {
    loaded: true,
    count: cache.entries.length,
    fetchedAt: cache.fetchedAt,
    stale: Date.now() - cache.fetchedAt > env.iptvMirrorCacheMs,
  };
}
