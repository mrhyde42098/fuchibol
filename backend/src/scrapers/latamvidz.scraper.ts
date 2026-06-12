import { profileByKey } from '../config/upstream-profiles.js';
import { decodeBase64Url, extractM3u8FromText, fetchText, slugFromStreamParam } from './base.scraper.js';

const LATAMVIDZ_HOSTS = [
  'https://latamvidz1.com',
  'https://latamvidzs.org',
];

/** Canal interno → slug(s) o URL en latamvidz (Fútbol Libre) */
const CHANNEL_TARGETS: Record<string, string[]> = {
  espn: ['espn'],
  espndeportes: ['espn'],
  espnar: ['espn'],
  espn2: ['espn2'],
  espn2ar: ['espn2'],
  fs1usa: ['https://latamvidzfy.org/fox1us.php', 'foxsports'],
  f2usa: ['foxsports2'],
  foxsports: ['foxsports', 'https://latamvidzfy.org/fox1us.php'],
  'premium-v2-foxsports': ['foxsports', 'https://latamvidzfy.org/fox1us.php'],
  'premium-v2-foxsports2': ['foxsports2'],
  foxdeportes: ['foxdeportes'],
  dsportsar: ['dsports'],
  'premium-v2-dsports': ['dsports'],
  'premium-v2-dsports2': ['dsports2'],
  tycsports: ['tycsports'],
  'premium-v2-tycsports': ['tycsports'],
  'premium-v2-winsports': ['winplus', 'winsports'],
  'premium-v2-winsports2': ['winplus'],
  'tvtvhd-winsports2': ['winplus'],
  tudnmx: ['tudn_usa'],
  'premium-v2-tudn_mx': ['tudn_usa'],
  'premium-v2-espnpremium': ['espnpremium'],
  'premium-v2-tntsports': ['tntsports'],
  telemundo: ['telemundo'],
};

const UPSTREAM_TO_CHANNEL: Record<string, string> = {
  dsports: 'premium-v2-dsports',
  tycsports: 'premium-v2-tycsports',
  foxsports: 'premium-v2-foxsports',
  fox1us: 'premium-v2-foxsports',
  winplus: 'premium-v2-winsports2',
  winsports: 'premium-v2-winsports',
  tudn_usa: 'tudnmx',
  espnpremium: 'premium-v2-espnpremium',
  tntsports: 'premium-v2-tntsports',
  espn: 'espn',
  espn2: 'espn2',
};

export function latamvidzTargetsForChannel(channelId: string): string[] {
  const slug = channelId.replace(/^premium-v2-|^tvtvhd-/, '').replace(/_/g, '');
  const targets = new Set<string>();
  for (const key of [channelId, slug, channelId.toLowerCase()]) {
    for (const t of CHANNEL_TARGETS[key] ?? []) targets.add(t);
  }
  return [...targets];
}

export function channelIdFromLatamvidzUrl(url: string): string | null {
  const slug = slugFromStreamParam(url);
  if (slug && UPSTREAM_TO_CHANNEL[slug]) return UPSTREAM_TO_CHANNEL[slug];
  if (url.includes('fox1us')) return 'premium-v2-foxsports';
  if (url.includes('tycsports')) return 'premium-v2-tycsports';
  if (url.includes('dsports')) return 'premium-v2-dsports';
  if (url.includes('winplus') || url.includes('winsports')) return 'premium-v2-winsports2';
  return slug;
}

export function latamvidzBackupToken(target: string): string {
  return `latamvidz:${target}`;
}

export function parseLatamvidzBackup(value: string): string | null {
  if (!value.startsWith('latamvidz:')) return null;
  return value.slice('latamvidz:'.length) || null;
}

async function resolveFromPage(pageUrl: string): Promise<string> {
  const profile = profileByKey('latamvidz');
  const html = await fetchText(pageUrl, { profile });

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

  throw new Error(`No m3u8 in latamvidz page: ${pageUrl}`);
}

/** Resuelve manifiesto HLS desde slug o URL latamvidz (CDN vivolatamz). */
export async function resolveLatamvidzManifest(target: string): Promise<string> {
  if (target.startsWith('http')) {
    return resolveFromPage(target);
  }

  const errors: unknown[] = [];
  for (const host of LATAMVIDZ_HOSTS) {
    const pageUrl = `${host}/canal.php?stream=${encodeURIComponent(target)}`;
    try {
      return await resolveFromPage(pageUrl);
    } catch (err) {
      errors.push(err);
    }
  }

  throw new Error(
    `latamvidz failed for ${target}: ${errors.map((e) => (e instanceof Error ? e.message : String(e))).join('; ')}`,
  );
}

export function futbolLibreEventUrl(encodedTarget: string): string {
  return `https://futbol-libres.su/eventos.html?r=${encodedTarget}`;
}

export function encodeFutbolLibreTarget(upstreamUrl: string): string {
  return Buffer.from(upstreamUrl, 'utf8').toString('base64');
}

export function decodeFutbolLibreParam(r: string): string {
  return decodeBase64Url(r);
}
