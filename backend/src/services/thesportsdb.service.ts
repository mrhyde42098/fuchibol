import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export interface TSDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strTimestamp: string | null;
  strStatus: string | null;
  strSport: string;
  strLeague: string;
  dateEvent: string;
  strTime: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
}

/** Orden de prioridad — menos deportes = menos 429 en plan gratuito */
const SPORTS = ['Soccer', 'Baseball', 'Basketball', 'Ice Hockey'] as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const FINISHED_STATUSES = new Set([
  'FT',
  'AET',
  'PEN',
  'AWD',
  'WO',
  'ABD',
  'CANC',
  'PST',
  'SUSP',
  'POST',
]);

const LIVE_STATUSES = new Set([
  '1H',
  '2H',
  'HT',
  'ET',
  'BT',
  'P',
  'LIVE',
  'INT',
  'IN PLAY',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
  'OT',
  'P1',
  'P2',
  'P3',
]);

let cachedEvents: { fetchedAt: number; events: TSDbEvent[] } | null = null;

function apiUrl(path: string): string {
  const key = env.thesportsdbApiKey;
  return `https://www.thesportsdb.com/api/v1/json/${key}/${path}`;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeTeamName(name: string): string {
  return normalizeText(name)
    .replace(/\b(fc|cf|sc|ac|cd|ud|deportivo|club|atletico|athletic)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTsdbEvent(raw: Record<string, unknown>): TSDbEvent | null {
  const idEvent = String(raw.idEvent ?? '');
  const strHomeTeam = String(raw.strHomeTeam ?? '');
  const strAwayTeam = String(raw.strAwayTeam ?? '');
  if (!idEvent || !strHomeTeam || !strAwayTeam) return null;

  return {
    idEvent,
    strEvent: String(raw.strEvent ?? `${strHomeTeam} vs ${strAwayTeam}`),
    strHomeTeam,
    strAwayTeam,
    strTimestamp: raw.strTimestamp ? String(raw.strTimestamp) : null,
    strStatus: raw.strStatus ? String(raw.strStatus) : null,
    strSport: String(raw.strSport ?? ''),
    strLeague: String(raw.strLeague ?? ''),
    dateEvent: String(raw.dateEvent ?? ''),
    strTime: String(raw.strTime ?? ''),
    intHomeScore: raw.intHomeScore != null ? String(raw.intHomeScore) : null,
    intAwayScore: raw.intAwayScore != null ? String(raw.intAwayScore) : null,
  };
}

async function fetchEventsDay(date: string, sport: string): Promise<TSDbEvent[]> {
  const url = apiUrl(`eventsday.php?d=${date}&s=${encodeURIComponent(sport)}`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.thesportsdbTimeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`TheSportsDB ${res.status}`);
    const json = (await res.json()) as { events?: Record<string, unknown>[] | null };
    const list = json.events ?? [];
    return list.map(parseTsdbEvent).filter((e): e is TSDbEvent => e != null);
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchRelevantTsdbEvents(): Promise<TSDbEvent[]> {
  if (cachedEvents && Date.now() - cachedEvents.fetchedAt < env.thesportsdbCacheMs) {
    return cachedEvents.events;
  }

  const unique = new Map<string, TSDbEvent>();
  let rateLimited = false;

  const fetchDaySport = async (dateStr: string, sport: string) => {
    if (rateLimited) return;
    await sleep(env.thesportsdbRequestDelayMs);
    try {
      const events = await fetchEventsDay(dateStr, sport);
      for (const ev of events) {
        unique.set(ev.idEvent, ev);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('429')) {
        rateLimited = true;
        logger.warn({ date: dateStr, sport }, 'TheSportsDB rate limit — using partial cache');
      } else {
        logger.warn({ err, date: dateStr, sport }, 'TheSportsDB fetch failed');
      }
    }
  };

  const today = formatDate(new Date());
  const tomorrow = formatDate(new Date(Date.now() + 86_400_000));

  if (env.thesportsdbMinimalMode) {
    await fetchDaySport(today, 'Soccer');
    if (!rateLimited) await fetchDaySport(today, 'Baseball');
    if (!rateLimited) await fetchDaySport(tomorrow, 'Soccer');
  } else {
    for (const dateStr of [today, tomorrow]) {
      if (rateLimited) break;
      for (const sport of SPORTS) {
        if (rateLimited) break;
        await fetchDaySport(dateStr, sport);
      }
    }
  }

  const events = Array.from(unique.values());
  cachedEvents = { fetchedAt: Date.now(), events };
  logger.info({ count: events.length }, 'TheSportsDB events loaded');
  return events;
}

export function isTsdbEventFinished(ev: TSDbEvent): boolean {
  const status = (ev.strStatus ?? '').toUpperCase().trim();
  return FINISHED_STATUSES.has(status);
}

export function isTsdbEventLive(ev: TSDbEvent): boolean {
  const status = (ev.strStatus ?? '').toUpperCase().trim();
  if (LIVE_STATUSES.has(status)) return true;
  return status.includes('LIVE') || status.includes('IN PLAY');
}

export function mapTsdbStatus(ev: TSDbEvent): string {
  if (isTsdbEventFinished(ev)) return 'FINALIZADO';
  if (isTsdbEventLive(ev)) return 'EN VIVO';
  return 'PROXIMO';
}

function extractTeamsFromTitle(title: string): [string, string] | null {
  const chunk = title.includes(':') ? title.split(':').pop()!.trim() : title;
  const parts = chunk.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  return [parts[0].trim(), parts[1].trim()];
}

function fuzzyTeamMatch(pelotaTeam: string, tsdbTeam: string): boolean {
  const a = normalizeTeamName(pelotaTeam);
  const b = normalizeTeamName(tsdbTeam);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;

  const wordsA = a.split(' ').filter((w) => w.length >= 4);
  const wordsB = b.split(' ').filter((w) => w.length >= 4);
  return wordsA.some((w) => wordsB.some((x) => w.includes(x) || x.includes(w)));
}

export function matchTsdbEvent(title: string, events: TSDbEvent[]): TSDbEvent | undefined {
  const teams = extractTeamsFromTitle(title);
  if (!teams) return undefined;

  const [teamA, teamB] = teams;
  if (!teamA || !teamB) return undefined;

  return events.find((ev) => {
    const homeOk =
      fuzzyTeamMatch(teamA, ev.strHomeTeam) || fuzzyTeamMatch(teamA, ev.strAwayTeam);
    const awayOk =
      fuzzyTeamMatch(teamB, ev.strHomeTeam) || fuzzyTeamMatch(teamB, ev.strAwayTeam);
    return homeOk && awayOk;
  });
}

export function getTsdbEventStart(ev: TSDbEvent): Date | null {
  if (ev.strTimestamp) {
    const d = new Date(ev.strTimestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (ev.dateEvent && ev.strTime) {
    const d = new Date(`${ev.dateEvent}T${ev.strTime}Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}
