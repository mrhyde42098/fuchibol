import * as cheerio from 'cheerio';
import { profileByKey } from '../config/upstream-profiles.js';
import type { AgendaChannelOption, AgendaEvent } from '../types/agenda.js';
import type { RawChannel } from '../types/channel.js';
import { decodeBase64Url, fetchText } from './base.scraper.js';
import {
  channelIdFromLatamvidzUrl,
  encodeFutbolLibreTarget,
  futbolLibreEventUrl,
  latamvidzBackupToken,
} from './latamvidz.scraper.js';

const BASE = 'https://futbol-libres.su';
const AGENDA_URL = `${BASE}/agenda/`;

const MONTHS: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function parseQuality(label: string): string {
  const m = label.match(/(\d{3,4})\s*p/i);
  return m ? `${m[1]}p` : '720p';
}

function qualityRank(quality?: string): number {
  const n = Number.parseInt(quality ?? '', 10);
  return Number.isFinite(n) ? n : 720;
}

function parseAgendaDate(label: string): string {
  const match = label.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (!match) return new Date().toISOString().slice(0, 10);
  const day = match[1].padStart(2, '0');
  const month = MONTHS[match[2].toLowerCase()] ?? '01';
  return `${match[3]}-${month}-${day}`;
}

function mapEventCategory(className: string): string {
  const key = className.toUpperCase();
  if (key.includes('FIFA') || key.includes('MUNDIAL')) return 'MUNDIAL';
  if (key.includes('LIB')) return 'LIBERTADORES';
  if (key.includes('SUD')) return 'SUDAMERICANA';
  if (key.includes('AR')) return 'LIGA AR';
  if (key.includes('COL')) return 'LIGA CO';
  if (key.includes('MEX')) return 'LIGA MX';
  if (key.includes('NBA')) return 'NBA';
  if (key.includes('MLB')) return 'MLB';
  if (key.includes('NHL')) return 'NHL';
  return 'DEPORTES';
}

function parseChannelLink(href: string, name: string, qualityLabel: string): AgendaChannelOption | null {
  const fullUrl = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
  const match = fullUrl.match(/[?&]r=([^&]+)/);
  if (!match) return null;

  const upstream = decodeBase64Url(match[1]);
  if (!upstream) return null;

  const channelId = channelIdFromLatamvidzUrl(upstream) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const quality = parseQuality(qualityLabel);

  return {
    name: name.trim(),
    quality,
    url: fullUrl,
    channelId,
  };
}

export async function scrapeFutbolLibreAgenda(): Promise<AgendaEvent[]> {
  const profile = profileByKey('futbolLibre');
  const html = await fetchText(AGENDA_URL, { profile });
  const $ = cheerio.load(html);

  const dateLabel = $('.sombreada_css3 b').first().text().trim();
  const eventDate = parseAgendaDate(dateLabel);
  const events: AgendaEvent[] = [];

  $('.menu > li').each((_, el) => {
    const li = $(el);
    const className = (li.attr('class') ?? '').split(/\s+/)[0] ?? '';
    const titleAnchor = li.children('a').first();
    const titleRaw = titleAnchor.clone().children('span').remove().end().text().trim();
    const timeSpan = titleAnchor.find('span.t').first().text().trim();
    if (!titleRaw || titleRaw.length < 4) return;

    const channels: AgendaChannelOption[] = [];
    li.find('ul li a').each((__, linkEl) => {
      const href = $(linkEl).attr('href');
      const chName = $(linkEl).clone().children('span').remove().end().text().trim();
      const qualityLabel = $(linkEl).find('span').last().text().trim();
      if (!href) return;
      const opt = parseChannelLink(href, chName, qualityLabel);
      if (opt) channels.push(opt);
    });

    if (channels.length === 0) return;

    channels.sort((a, b) => qualityRank(b.quality) - qualityRank(a.quality));

    events.push({
      title: titleRaw,
      time: timeSpan || '—',
      category: mapEventCategory(className),
      language: 'Español',
      status: 'PROXIMO',
      date: eventDate,
      dateLabel,
      channelId: channels[0].channelId,
      link: channels[0].url,
      channelName: channels.map((c) => c.name).join(', '),
      channels,
    });
  });

  return events;
}

/** Canales directos de la home + backups latamvidz para el resolver */
export async function scrapeFutbolLibreChannels(): Promise<RawChannel[]> {
  const profile = profileByKey('futbolLibre');
  const html = await fetchText(`${BASE}/`, { profile });
  const $ = cheerio.load(html);
  const channels = new Map<string, RawChannel>();

  $('a[href*="/espn"], a[href*="directv"], a[href*="tyc"], a[href*="win-sports"], a[href*="fox-sports"], a[href*="tudn"], a[href*="tnt-sports"], a[href*="espn-premium"]')
    .each((_, el) => {
      const href = $(el).attr('href');
      const name = $(el).text().trim();
      if (!href || !name || name.length < 3) return;
      if (name.toLowerCase().includes('ver canal')) return;

      const path = href.replace(/\/$/, '');
      const slug = path.split('/').filter(Boolean).pop();
      if (!slug) return;

      const latamSlug = FUTBOL_LIBRE_PATH_TO_LATAMVIDZ[slug];
      if (!latamSlug) return;

      const internalId = channelIdFromLatamvidzUrl(
        latamSlug.startsWith('http') ? latamSlug : `https://latamvidz1.com/canal.php?stream=${latamSlug}`,
      );
      if (!internalId) return;

      const backup = latamvidzBackupToken(latamSlug);
      const existing = channels.get(internalId);
      if (existing) {
        if (!existing.backups?.includes(backup)) {
          existing.backups = [...(existing.backups ?? []), backup];
        }
        return;
      }

      channels.set(internalId, {
        id: internalId,
        name: name.toUpperCase(),
        category: 'Canales',
        logo: '',
        backups: [backup],
        source: 'futbol-libre',
      });
    });

  return Array.from(channels.values());
}

const FUTBOL_LIBRE_PATH_TO_LATAMVIDZ: Record<string, string> = {
  'espn-1': 'espn',
  'directv-sports': 'dsports',
  'tyc-sports': 'tycsports',
  'win-sports-premium': 'winplus',
  'fox-sports': 'foxsports',
  tudn: 'tudn_usa',
  'espn-premium': 'espnpremium',
  'tnt-sports': 'tntsports',
};

export function mergeAgendaBySource(
  pelota: AgendaEvent[],
  futbolLibre: AgendaEvent[],
): AgendaEvent[] {
  const merged = new Map<string, AgendaEvent>();

  const mergeChannels = (
    a: AgendaChannelOption[] = [],
    b: AgendaChannelOption[] = [],
  ): AgendaChannelOption[] => {
    const byKey = new Map<string, AgendaChannelOption>();
    for (const ch of [...a, ...b]) {
      const key = `${ch.channelId ?? ''}:${ch.name}`;
      const prev = byKey.get(key);
      if (!prev || qualityRank(ch.quality) > qualityRank(prev.quality)) {
        byKey.set(key, ch);
      }
    }
    return [...byKey.values()].sort((x, y) => qualityRank(y.quality) - qualityRank(x.quality));
  };

  const ingest = (ev: AgendaEvent) => {
    const key = `${ev.title.toLowerCase().replace(/\s+/g, ' ').trim()}:${ev.date}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...ev });
      return;
    }
    const channels = mergeChannels(prev.channels, ev.channels);
    merged.set(key, {
      ...prev,
      ...ev,
      channels,
      channelId: channels[0]?.channelId ?? prev.channelId ?? ev.channelId,
      link: channels[0]?.url ?? prev.link ?? ev.link,
      channelName: channels.map((c) => c.name).join(', '),
      dateLabel: prev.dateLabel ?? ev.dateLabel,
    });
  };

  for (const ev of pelota) ingest(ev);
  for (const ev of futbolLibre) ingest(ev);

  return Array.from(merged.values());
}

export function futbolLibrePageForUpstream(upstreamUrl: string): string {
  return futbolLibreEventUrl(encodeFutbolLibreTarget(upstreamUrl));
}
