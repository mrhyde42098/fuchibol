import type { AgendaEvent } from '../types/agenda.js';
import {
  mergeAgendaBySource,
  scrapeFutbolLibreAgenda,
} from '../scrapers/futbol-libre.scraper.js';
import { scrapePelotaLibreAgenda } from '../scrapers/pelota-libre.scraper.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  attachSuggestedChannels,
  isAgendaEventRelevant,
} from './agenda-channels.service.js';
import {
  fetchEspnAgendaEvents,
  isEspnEventFinished,
} from './espn-agenda.service.js';
import {
  fetchRelevantTsdbEvents,
  getTsdbEventStart,
  isTsdbEventFinished,
  mapTsdbStatus,
  matchTsdbEvent,
  type TSDbEvent,
} from './thesportsdb.service.js';

function formatDisplayTime(date: Date): string {
  return date.toLocaleTimeString('es-ES', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function tsdbToAgendaEvent(ev: TSDbEvent): AgendaEvent {
  const start = getTsdbEventStart(ev);
  const end = start
    ? new Date(start.getTime() + estimatedDurationMs(mapLeagueCategory(ev.strLeague, ev.strSport)))
    : null;
  const homeScore = ev.intHomeScore != null ? Number(ev.intHomeScore) : null;
  const awayScore = ev.intAwayScore != null ? Number(ev.intAwayScore) : null;

  return {
    title: ev.strEvent,
    time: start ? formatDisplayTime(start) : ev.strTime?.slice(0, 5) ?? '—',
    category: mapLeagueCategory(ev.strLeague, ev.strSport),
    language: 'Español',
    status: mapTsdbStatus(ev),
    date: ev.dateEvent || todayDateStr(),
    channelId: null,
    externalEventId: ev.idEvent,
    tsdbLeague: ev.strLeague,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    endsAt: end?.toISOString(),
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '../../..');

const DURATION_MINUTES: Record<string, number> = {
  FIFA: 105,
  MUNDIAL: 105,
  LALIGA: 105,
  LALIGA2: 105,
  MLB: 180,
  NBA: 150,
  NHL: 150,
  DEFAULT: 120,
};

function parsePelotaTime(time: string, date: string): Date | null {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();

  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  const d = new Date(`${date}T00:00:00`);
  d.setHours(hours, minutes, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function estimatedDurationMs(category: string): number {
  const key = category.toUpperCase();
  const mins = DURATION_MINUTES[key] ?? DURATION_MINUTES.DEFAULT;
  return mins * 60_000;
}

function getEventStart(ev: AgendaEvent, tsdb?: TSDbEvent): Date | null {
  if (tsdb) {
    const fromApi = getTsdbEventStart(tsdb);
    if (fromApi) return fromApi;
  }
  return parsePelotaTime(ev.time, ev.date);
}

function getEventEnd(ev: AgendaEvent, tsdb?: TSDbEvent): Date | null {
  const start = getEventStart(ev, tsdb);
  if (!start) return null;
  return new Date(start.getTime() + estimatedDurationMs(ev.category));
}

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function normalizeTitleKey(title: string): string {
  return title
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isFinishedAgendaEvent(ev: AgendaEvent, tsdb?: TSDbEvent): boolean {
  if (tsdb && isTsdbEventFinished(tsdb)) return true;
  if (isEspnEventFinished(ev)) return true;

  const status = ev.status.toUpperCase();
  if (status.includes('FIN') || status.includes('FT') || status.includes('FINALIZADO')) return true;

  const today = todayDateStr();
  if (ev.date < today) return true;

  const end = getEventEnd(ev, tsdb);
  if (end && Date.now() > end.getTime()) return true;

  return false;
}

function enrichEvent(ev: AgendaEvent, tsdbEvents: TSDbEvent[]): AgendaEvent {
  const match = matchTsdbEvent(ev.title, tsdbEvents);
  if (!match) return ev;

  const start = getTsdbEventStart(match);
  const end = getEventEnd(ev, match);
  const homeScore = match.intHomeScore != null ? Number(match.intHomeScore) : null;
  const awayScore = match.intAwayScore != null ? Number(match.intAwayScore) : null;

  return {
    ...ev,
    externalEventId: match.idEvent,
    status: mapTsdbStatus(match),
    category: ev.category === 'DEPORTES' ? mapLeagueCategory(match.strLeague, match.strSport) : ev.category,
    tsdbLeague: match.strLeague,
    homeScore: Number.isFinite(homeScore) ? homeScore : null,
    awayScore: Number.isFinite(awayScore) ? awayScore : null,
    endsAt: end?.toISOString(),
    ...(start
      ? {
          time: start.toLocaleTimeString('es-ES', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }),
        }
      : {}),
  };
}

function mapLeagueCategory(league: string, sport: string): string {
  const hay = `${league} ${sport}`.toUpperCase();
  if (hay.includes('WORLD CUP') || hay.includes('MUNDIAL') || hay.includes('FIFA')) return 'MUNDIAL';
  if (hay.includes('LA LIGA')) return 'LALIGA';
  if (hay.includes('MLB') || sport === 'Baseball') return 'MLB';
  if (hay.includes('NBA') || sport === 'Basketball') return 'NBA';
  if (hay.includes('NHL') || sport.includes('Hockey')) return 'NHL';
  return sport.toUpperCase();
}

async function loadFallbackAgenda(): Promise<AgendaEvent[]> {
  const path = resolve(projectRoot, env.fallbackAgendaPath);
  const raw = await readFile(path, 'utf8');
  return JSON.parse(raw) as AgendaEvent[];
}

async function loadBaseAgenda(): Promise<AgendaEvent[]> {
  const [pelota, futbolLibre] = await Promise.allSettled([
    scrapePelotaLibreAgenda(),
    env.futbolLibreEnabled ? scrapeFutbolLibreAgenda() : Promise.resolve([]),
  ]);

  const pelotaEvents = pelota.status === 'fulfilled' ? pelota.value : [];
  const futbolEvents = futbolLibre.status === 'fulfilled' ? futbolLibre.value : [];

  if (pelota.status === 'rejected') {
    logger.warn({ err: pelota.reason }, 'Pelota Libre agenda failed');
  }
  if (futbolLibre.status === 'rejected') {
    logger.warn({ err: futbolLibre.reason }, 'Futbol Libre agenda failed');
  }

  if (pelotaEvents.length > 0 || futbolEvents.length > 0) {
    const merged = mergeAgendaBySource(pelotaEvents, futbolEvents);
    logger.info(
      { pelota: pelotaEvents.length, futbolLibre: futbolEvents.length, merged: merged.length },
      'Agenda scraped',
    );
    return merged;
  }

  try {
    logger.warn('Loading fallback agenda.json');
    return await loadFallbackAgenda();
  } catch (err) {
    logger.warn({ err }, 'Fallback agenda unavailable');
    return [];
  }
}

/**
 * Carga agenda con canales de Pelota Libre y estado/horarios de TheSportsDB.
 * Elimina eventos solo cuando terminan (FT o hora fin estimada), no al iniciar.
 */
export async function loadEnrichedAgenda(): Promise<AgendaEvent[]> {
  const base = await loadBaseAgenda();
  const tsdbEvents = env.thesportsdbEnabled
    ? await fetchRelevantTsdbEvents().catch(() => [])
    : [];

  const enriched = base.map((ev) => enrichEvent(ev, tsdbEvents));
  let active = enriched.filter((ev) => {
    const match = ev.externalEventId
      ? tsdbEvents.find((t) => t.idEvent === ev.externalEventId)
      : matchTsdbEvent(ev.title, tsdbEvents);
    return !isFinishedAgendaEvent(ev, match);
  });

  if (active.length === 0 && enriched.length > 0 && tsdbEvents.length === 0) {
    active = enriched.filter((ev) => ev.date >= todayDateStr());
    logger.warn(
      { kept: active.length },
      'TheSportsDB unavailable — showing today+ events without live status',
    );
  }

  const matchedTsdbIds = new Set(
    active.map((ev) => ev.externalEventId).filter((id): id is string => Boolean(id)),
  );

  for (const t of tsdbEvents) {
    if (isTsdbEventFinished(t)) continue;
    if (matchedTsdbIds.has(t.idEvent)) continue;
    if (t.dateEvent && t.dateEvent < todayDateStr()) continue;

    const pelota = base.find((ev) => matchTsdbEvent(ev.title, [t]));
    let agenda = tsdbToAgendaEvent(t);

    if (pelota) {
      agenda = {
        ...pelota,
        ...agenda,
        channels: pelota.channels,
        channelId: pelota.channelId ?? agenda.channelId,
        channelName: pelota.channelName,
        link: pelota.link,
        dateLabel: pelota.dateLabel,
      };
    }

    active.push(agenda);
    matchedTsdbIds.add(t.idEvent);
  }

  if (env.espnAgendaEnabled) {
    const espnEvents = await fetchEspnAgendaEvents().catch(() => []);
    const seenKeys = new Set(active.map((ev) => `${normalizeTitleKey(ev.title)}:${ev.date}`));

    for (const ev of espnEvents) {
      if (isFinishedAgendaEvent(ev)) continue;
      const key = `${normalizeTitleKey(ev.title)}:${ev.date}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      active.push(ev);
    }
  }

  active = active
    .map(attachSuggestedChannels)
    .filter(isAgendaEventRelevant);

  active.sort((a, b) => {
    const sa = getEventStart(a)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const sb = getEventStart(b)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return sa - sb;
  });

  logger.info(
    {
      base: base.length,
      tsdb: tsdbEvents.length,
      espn: env.espnAgendaEnabled,
      active: active.length,
    },
    'Agenda enriched',
  );

  return active;
}
