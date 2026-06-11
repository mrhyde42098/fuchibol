import type { ProfileKey } from '../config/upstream-profiles.js';
import { profileForUrl } from '../config/upstream-profiles.js';
import { buildProxyUrl } from '../services/token.service.js';

const PLAYLIST_EXTENSIONS = /\.(m3u8|m3u)(\?|$)/i;
const SEGMENT_EXTENSIONS = /\.(ts|m4s|aac|mp4|vtt)(\?|$)/i;
const KEY_EXTENSIONS = /\.(key)(\?|$)/i;

function isPlaylistUrl(url: string): boolean {
  return PLAYLIST_EXTENSIONS.test(url) || url.includes('m3u8');
}

function isSegmentUrl(url: string): boolean {
  return SEGMENT_EXTENSIONS.test(url) || KEY_EXTENSIONS.test(url);
}

function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

function proxyUrlForUpstream(upstreamUrl: string, baseUrl: string): string {
  const absolute = resolveUrl(upstreamUrl, baseUrl);
  const { key } = profileForUrl(absolute);
  const type = isPlaylistUrl(absolute) && !isSegmentUrl(absolute) ? 'manifest' : 'segment';
  if (isPlaylistUrl(absolute)) {
    return buildProxyUrl('manifest', absolute, key);
  }
  return buildProxyUrl(type, absolute, key);
}

export function rewriteM3u8(content: string, baseUpstreamUrl: string): string {
  const lines = content.split(/\r?\n/);
  const output: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      output.push(line);
      continue;
    }

    if (trimmed.startsWith('#')) {
      const uriMatch = trimmed.match(/URI="([^"]+)"/i);
      if (uriMatch?.[1]) {
        const proxied = proxyUrlForUpstream(uriMatch[1], baseUpstreamUrl);
        output.push(trimmed.replace(uriMatch[1], proxied));
        continue;
      }
      output.push(line);
      continue;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || !trimmed.startsWith('#')) {
      const proxied = proxyUrlForUpstream(trimmed, baseUpstreamUrl);
      output.push(proxied);
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}
