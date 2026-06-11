import * as cheerio from 'cheerio';
import { profileByKey } from '../config/upstream-profiles.js';
import type { AgendaEvent } from '../types/agenda.js';
import type { RawChannel } from '../types/channel.js';
import { decodeBase64Url, extractM3u8FromText, fetchText, slugFromStreamParam } from './base.scraper.js';
import { decodeStreamXhdPlaybackUrl } from './stream-xhd.decoder.js';

const BASE = 'https://pelotalibrestv.org';
const STREAM_XHD = 'https://stream-xhd.com/live1.php';

export async function scrapePelotaLibreChannels(): Promise<RawChannel[]> {
  const profile = profileByKey('pelotaLibre');
  const html = await fetchText(`${BASE}/`, { profile });
  const $ = cheerio.load(html);
  const channels = new Map<string, RawChannel>();

  $('a[href*="eventos.html?r="]').each((_, el) => {
    const href = $(el).attr('href');
    const name = $(el).text().trim() || $(el).attr('title')?.trim();
    if (!href || !name) return;

    const fullUrl = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
    const match = fullUrl.match(/[?&]r=([^&]+)/);
    if (!match) return;

    const decoded = decodeBase64Url(match[1]);
    const slug = slugFromStreamParam(decoded) ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '');

    if (!channels.has(slug)) {
      channels.set(slug, {
        id: slug,
        name: name.toUpperCase(),
        category: 'Canales',
        logo: '',
        backups: [],
        source: 'pelotalibre',
      });
    }
  });

  if (channels.size === 0) {
    return scrapeChannelsFromAgendaPage(profile);
  }

  return Array.from(channels.values());
}

async function scrapeChannelsFromAgendaPage(profile: ReturnType<typeof profileByKey>): Promise<RawChannel[]> {
  const html = await fetchText(`${BASE}/`, { profile });
  const channels = new Map<string, RawChannel>();

  const linkRegex = /eventos\.html\?r=([A-Za-z0-9+/=]+)/g;
  let m: RegExpExecArray | null;
  while ((m = linkRegex.exec(html)) !== null) {
    const decoded = decodeBase64Url(m[1]);
    const slug = slugFromStreamParam(decoded);
    if (!slug) continue;
    const fullId = `${BASE}/eventos.html?r=${m[1]}`;
    if (!channels.has(slug)) {
      channels.set(slug, {
        id: slug,
        name: slug.toUpperCase(),
        category: 'Canales',
        logo: '',
        backups: [],
        source: 'pelotalibre',
      });
    }
    void fullId;
  }

  return Array.from(channels.values());
}

export async function scrapePelotaLibreAgenda(): Promise<AgendaEvent[]> {
  const profile = profileByKey('pelotaLibre');
  const html = await fetchText(`${BASE}/`, { profile });
  const $ = cheerio.load(html);
  const events: AgendaEvent[] = [];

  $('[class*="event"], .event-card, article, li').each((_, el) => {
    const block = $(el);
    const title = block.find('h2, h3, .title, strong').first().text().trim();
    const time = block.find('.time, .hora, [class*="time"]').first().text().trim();
    if (!title || title.length < 5) return;

    const links = block.find('a[href*="eventos.html?r="]');
    const channelOptions: AgendaEvent['channels'] = [];

    links.each((__, link) => {
      const href = $(link).attr('href');
      const chName = $(link).text().trim();
      if (!href) return;
      const fullUrl = href.startsWith('http') ? href : `${BASE}${href.startsWith('/') ? '' : '/'}${href}`;
      const match = fullUrl.match(/[?&]r=([^&]+)/);
      const decoded = match ? decodeBase64Url(match[1]) : '';
      const channelId = slugFromStreamParam(decoded) ?? chName.toLowerCase().replace(/[^a-z0-9]+/g, '');
      channelOptions.push({
        name: chName || channelId,
        quality: '720p',
        url: fullUrl,
        channelId,
      });
    });

    if (channelOptions.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    events.push({
      title,
      time: time || '12:00pm',
      category: 'DEPORTES',
      language: 'Español',
      status: 'PROXIMO',
      date: today,
      channelId: channelOptions[0].channelId,
      link: channelOptions[0].url,
      channelName: channelOptions.map((c) => c.name).join(', '),
      channels: channelOptions,
    });
  });

  return events;
}

export async function resolveStreamXhdManifest(streamSlug: string): Promise<string> {
  const profile = profileByKey('streamXhd');
  const pageUrl = `${STREAM_XHD}?stream=${encodeURIComponent(streamSlug)}`;
  const html = await fetchText(pageUrl, { profile });

  const decoded = decodeStreamXhdPlaybackUrl(html);
  if (decoded) return decoded;

  const m3u8 = extractM3u8FromText(html);
  if (m3u8) return m3u8;

  const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) {
    const iframeUrl = iframeMatch[1].startsWith('http')
      ? iframeMatch[1]
      : new URL(iframeMatch[1], pageUrl).toString();
    const iframeHtml = await fetchText(iframeUrl, { profile });
    const fromIframe = extractM3u8FromText(iframeHtml);
    if (fromIframe) return fromIframe;
  }

  throw new Error(`No m3u8 found for stream-xhd slug: ${streamSlug}`);
}

export function pelotaLibrePageUrlForSlug(slug: string): string {
  const upstream = `${STREAM_XHD}?stream=${encodeURIComponent(slug)}`;
  const encoded = Buffer.from(upstream, 'utf8').toString('base64');
  return `${BASE}/eventos.html?r=${encoded}`;
}
