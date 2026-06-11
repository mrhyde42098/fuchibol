import * as cheerio from 'cheerio';
import { profileByKey } from '../config/upstream-profiles.js';
import type { RawChannel } from '../types/channel.js';
import { extractM3u8FromText, fetchText } from './base.scraper.js';

const BASE = 'https://la18hd.com';

export async function scrapeLa18hdChannels(): Promise<RawChannel[]> {
  const profile = profileByKey('la18hd');
  const html = await fetchText(BASE, { profile });
  const $ = cheerio.load(html);
  const channels: RawChannel[] = [];
  const seen = new Set<string>();

  $('a[href*="premium"], a[href*="canal"], a[href*="embed"], button, [data-channel], [data-slug]').each((_, el) => {
    const slug =
      $(el).attr('data-slug') ||
      $(el).attr('data-channel') ||
      $(el).attr('href')?.match(/[?&](?:stream|canal|ch)=([^&]+)/)?.[1];
    const name = $(el).text().trim() || $(el).attr('title')?.trim();
    if (!slug || !name || name.length < 2) return;

    const cleanSlug = slug.replace(/^premium-v2-/, '').replace(/[^a-z0-9_]/gi, '');
    const id = `premium-v2-${cleanSlug}`;
    if (seen.has(id)) return;
    seen.add(id);

    channels.push({
      id,
      name,
      category: 'Premium',
      logo: '',
      source: 'la18hd',
      mirror: BASE,
    });
  });

  if (channels.length === 0) {
    return getLa18hdFallbackChannels();
  }

  return channels;
}

function getLa18hdFallbackChannels(): RawChannel[] {
  const slugs = [
    'dsports', 'dsports2', 'dsportsplus', 'foxsports', 'foxsports2', 'foxsports3',
    'tntsports', 'espnpremium', 'tycsports', 'telefe', 'movistar', 'winsports',
    'tudn_mx', 'canal5', 'foxdeportes', 'espndeportes', 'univision', 'dazn1',
  ];
  return slugs.map((slug) => ({
    id: `premium-v2-${slug}`,
    name: slug.replace(/_/g, ' ').toUpperCase(),
    category: 'Premium',
    logo: '',
    source: 'la18hd',
    mirror: BASE,
  }));
}

export async function resolveLa18hdManifest(channelId: string): Promise<string> {
  const profile = profileByKey('la18hd');
  const slug = channelId.replace(/^premium-v2-/, '');
  const candidates = [
    `${BASE}/premium/${slug}`,
    `${BASE}/canal/${slug}`,
    `${BASE}/embed/${slug}`,
    `${BASE}/?canal=${slug}`,
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

  throw new Error(`No m3u8 found for la18hd channel: ${channelId}`);
}
