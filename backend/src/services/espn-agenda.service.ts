import type { AgendaEvent } from '../types/agenda.js';
import { logger } from '../utils/logger.js';

/** Ligas que PKPlay consume vía site.api.espn.com — prioridad LATAM */
const ESPN_FEEDS: { path: string; category: string; label: string }[] = [
  { path: 'soccer/col.1/scoreboard', category: 'LIGA CO', label: 'Liga BetPlay Colombia' },
  { path: 'soccer/arg.1/scoreboard', category: 'LIGA AR', label: 'Liga Argentina' },
  { path: 'soccer/mex.1/scoreboard', category: 'LIGA MX', label: 'Liga MX' },
  { path: 'soccer/bra.1/scoreboard', category: 'LIGA BR', label: 'Brasileirão' },
  { path: 'soccer/conmebol.libertadores/scoreboard', category: 'LIBERTADORES', label: 'Copa Libertadores' },
  { path: 'soccer/conmebol.sudamericana/scoreboard', category: 'SUDAMERICANA', label: 'Copa Sudamericana' },
  { path: 'soccer/usa.1/scoreboard', category: 'MLS', label: 'MLS' },
  { path: 'soccer/uefa.champions/scoreboard', category: 'CHAMPIONS', label: 'UEFA Champions League' },
  { path: 'soccer/esp.1/scoreboard', category: 'LALIGA', label: 'LaLiga' },
  { path: 'baseball/mlb/scoreboard', category: 'MLB', label: 'MLB' },
  { path: 'basketball/nba/scoreboard', category: 'NBA', label: 'NBA' },
  { path: 'hockey/nhl/scoreboard', category: 'NHL', label: 'NHL' },
];

const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

interface EspnCompetitor {
  homeAway?: string;
  score?: string;
  team?: { displayName?: string };
}

interface EspnEvent {
  id: string;
  name: string;
  date: string;
  status?: {
    type?: { state?: string; shortDetail?: string; description?: string };
  };
  competitions?: Array<{ competitors?: EspnCompetitor[] }>;
}

interface EspnScoreboard {
  events?: EspnEvent[];
  leagues?: Array<{ name?: string }>;
}

let cache: { fetchedAt: number; events: AgendaEvent[] } | null = null;
const CACHE_MS = 120_000;

function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function mapEspnStatus(state: string | undefined, shortDetail?: string): string {
  if (state === 'in') return 'EN VIVO';
  if (state === 'post') return 'FINALIZADO';
  if (shortDetail) return shortDetail.toUpperCase();
  return 'PROXIMO';
}

function parseScores(competition?: EspnEvent['competitions']): {
  homeScore: number | null;
  awayScore: number | null;
} {
  const comps = competition?.[0]?.competitors ?? [];
  let homeScore: number | null = null;
  let awayScore: number | null = null;

  for (const c of comps) {
    const score = c.score != null ? Number(c.score) : null;
    if (!Number.isFinite(score)) continue;
    if (c.homeAway === 'home') homeScore = score;
    if (c.homeAway === 'away') awayScore = score;
  }

  return { homeScore, awayScore };
}

function eventToAgenda(ev: EspnEvent, feed: (typeof ESPN_FEEDS)[number]): AgendaEvent | null {
  if (!ev.name || !ev.date) return null;

  const start = new Date(ev.date);
  if (Number.isNaN(start.getTime())) return null;

  const state = ev.status?.type?.state;
  const { homeScore, awayScore } = parseScores(ev.competitions);
  const endsAt = new Date(start.getTime() + 2 * 60 * 60_000).toISOString();

  return {
    title: ev.name,
    time: formatDisplayTime(start),
    category: feed.category,
    language: 'Español',
    status: mapEspnStatus(state, ev.status?.type?.shortDetail),
    date: start.toISOString().slice(0, 10),
    channelId: null,
    externalEventId: `espn:${ev.id}`,
    tsdbLeague: feed.label,
    homeScore,
    awayScore,
    endsAt,
  };
}

async function fetchFeed(path: string): Promise<EspnScoreboard> {
  const url = `${ESPN_BASE}/${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Fuchibol/1.0' },
    });
    if (!res.ok) throw new Error(`ESPN ${res.status}`);
    return (await res.json()) as EspnScoreboard;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchEspnAgendaEvents(): Promise<AgendaEvent[]> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_MS) {
    return cache.events;
  }

  const all: AgendaEvent[] = [];

  for (const feed of ESPN_FEEDS) {
    try {
      const board = await fetchFeed(feed.path);
      for (const ev of board.events ?? []) {
        const agenda = eventToAgenda(ev, feed);
        if (agenda) all.push(agenda);
      }
    } catch (err) {
      logger.debug({ err, feed: feed.path }, 'ESPN scoreboard fetch failed');
    }
  }

  cache = { fetchedAt: Date.now(), events: all };
  logger.info({ count: all.length }, 'ESPN agenda events loaded');
  return all;
}

export function isEspnEventFinished(ev: AgendaEvent): boolean {
  const s = ev.status.toUpperCase();
  return s.includes('FIN') || s.includes('FT') || s === 'FINALIZADO';
}

export function isEspnEventLive(ev: AgendaEvent): boolean {
  return ev.status.toUpperCase().includes('VIVO') || ev.status.toUpperCase().includes('LIVE');
}
