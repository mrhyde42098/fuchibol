import { env } from '../config/env.js';
import type { UpstreamProfile } from '../config/upstream-profiles.js';
import { logger } from '../utils/logger.js';

export interface FetchOptions {
  profile?: UpstreamProfile;
  timeoutMs?: number;
  accept?: string;
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);
  const profile = options.profile;

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': profile?.userAgent ?? env.defaultUserAgent,
        Accept: options.accept ?? 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        ...(profile?.origin ? { Origin: profile.origin } : {}),
        ...(profile?.referer ? { Referer: profile.referer } : {}),
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }

    return await response.text();
  } catch (err) {
    logger.debug({ err, url }, 'fetchText failed');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function decodeBase64Url(value: string): string {
  try {
    return Buffer.from(value, 'base64').toString('utf8');
  } catch {
    return '';
  }
}

export function extractM3u8FromText(text: string): string | null {
  const patterns = [
    /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/i,
    /["']([^"']+\.m3u8[^"']*)["']/i,
    /source:\s*["']([^"']+\.m3u8[^"']*)["']/i,
    /file:\s*["']([^"']+\.m3u8[^"']*)["']/i,
    /src:\s*["']([^"']+\.m3u8[^"']*)["']/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
    }
  }
  return null;
}

export function slugFromStreamParam(url: string): string | null {
  try {
    const u = new URL(url);
    return u.searchParams.get('stream');
  } catch {
    return null;
  }
}
