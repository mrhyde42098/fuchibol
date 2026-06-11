import * as cheerio from 'cheerio';
import { profileByKey } from '../config/upstream-profiles.js';
import type { RawChannel } from '../types/channel.js';
import { extractM3u8FromText, fetchText } from './base.scraper.js';

const BASE = 'https://tvtvhd.com';

export async function scrapeTvtvhdChannels(): Promise<RawChannel[]> {
  const profile = profileByKey('tvtvhd');
  let html: string;
  try {
    html = await fetchText(BASE, { profile });
  } catch {
    return getTvtvhdFallbackChannels();
  }

  const $ = cheerio.load(html);
  const channels: RawChannel[] = [];
  const seen = new Set<string>();

  $('a[href], [data-channel], [data-slug]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    const dataSlug = $(el).attr('data-slug') || $(el).attr('data-channel');
    const slug =
      dataSlug ||
      href.match(/tvtvhd-([a-z0-9_]+)/i)?.[1] ||
      href.match(/[?&](?:stream|canal|ch)=([^&]+)/i)?.[1];
    const name = $(el).text().trim() || $(el).attr('title')?.trim();
    if (!slug || !name || name.length < 2) return;

    const id = slug.startsWith('tvtvhd-') ? slug : `tvtvhd-${slug}`;
    if (seen.has(id)) return;
    seen.add(id);

    channels.push({
      id,
      name,
      category: 'Premium 2',
      logo: '',
      source: 'tvtvhd',
    });
  });

  if (channels.length === 0) {
    return getTvtvhdFallbackChannels();
  }

  return channels;
}

function getTvtvhdFallbackChannels(): RawChannel[] {
  const slugs = [
    'espn', 'espn2', 'espn3', 'dsports', 'dsports2', 'goltv', 'foxsports', 'foxsports2',
    'tntsports', 'espnpremium', 'tycsports', 'telefe', 'movistar', 'foxdeportes',
    'espndeportes', 'tudn', 'beinsportes', 'telemundo', 'sportv', 'sportv2',
  ];
  return slugs.map((slug) => ({
    id: `tvtvhd-${slug}`,
    name: slug.toUpperCase(),
    category: 'Premium 2',
    logo: '',
    source: 'tvtvhd',
  }));
}

export async function resolveTvtvhdManifest(channelId: string): Promise<string> {
  const profile = profileByKey('tvtvhd');
  const slug = channelId.replace(/^tvtvhd-/, '');
  const candidates = [
    `${BASE}/canal/${slug}`,
    `${BASE}/embed/${slug}`,
    `${BASE}/?canal=${slug}`,
    `${BASE}/live/${slug}`,
  ];

  for (const url of candidates) {
    try {
      const html = await fetchText(url, { profile });
      const m3u8 = extractM3u8FromText(html);
      if (m3u8) return m3u8;

      const iframe = html.match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1];
      if (iframe) {
        const iframeUrl = iframe.startsWith('http') ? iframe : new URL(iframe, url).toString();
        const iframeHtml = await fetchText(iframeUrl, { profile });
        const fromIframe = extractM3u8FromText(iframeHtml);
        if (fromIframe) return fromIframe;
      }
    } catch {
      continue;
    }
  }

  throw new Error(`No m3u8 found for tvtvhd channel: ${channelId}`);
}
