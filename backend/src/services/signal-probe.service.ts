import { profileForUrl } from '../config/upstream-profiles.js';
import { env } from '../config/env.js';
import { fetchUpstream } from '../proxy/upstream-client.js';

export type SignalKind = 'live' | 'standby' | 'offline' | 'unknown';

const M3U8_MARKERS = ['#EXTM3U', '#EXT-X-STREAM-INF', '#EXTINF'];

const STANDBY_MARKERS = [
  'slate',
  'placeholder',
  'bumper',
  'splash',
  'idle',
  'standby',
  'coming-soon',
  'coming_soon',
  'comingsoon',
  'proximamente',
  'comenzara',
  'begin shortly',
  'off-air',
  'offair',
  'intermission',
  'filler',
  'hold-frame',
];

function parseVariants(
  manifestText: string,
  baseUrl: string,
): { url: string; bandwidth: number }[] {
  const lines = manifestText.split(/\r?\n/);
  const variants: { url: string; bandwidth: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('#EXT-X-STREAM-INF')) continue;

    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const next = lines[i + 1]?.trim();
    if (!next || next.startsWith('#')) continue;

    try {
      variants.push({
        url: new URL(next, baseUrl).toString(),
        bandwidth: bwMatch ? Number(bwMatch[1]) : 0,
      });
    } catch {
      /* skip */
    }
  }

  return variants;
}

export function isValidM3u8Body(body: string): boolean {
  return M3U8_MARKERS.some((m) => body.includes(m));
}

export function detectHdFromManifest(manifestBody: string): boolean {
  const lower = manifestBody.toLowerCase();
  return (
    lower.includes('1080') ||
    lower.includes('720') ||
    lower.includes('hd') ||
    lower.includes('high')
  );
}

export function detectSignalFromManifest(manifestText: string): SignalKind {
  if (!isValidM3u8Body(manifestText)) return 'offline';

  const lower = manifestText.toLowerCase();

  if (STANDBY_MARKERS.some((m) => lower.includes(m))) return 'standby';

  if (lower.includes('#ext-x-endlist')) {
    const segmentCount = (manifestText.match(/#EXTINF:/gi) ?? []).length;
    if (segmentCount <= 8) return 'standby';
  }

  if (lower.includes('#extinf') && !lower.includes('#ext-x-endlist')) return 'live';
  if (lower.includes('#ext-x-playlist-type:event')) return 'live';
  if (lower.includes('#ext-x-stream-inf')) return 'live';

  return 'live';
}

async function fetchManifestText(manifestUrl: string): Promise<string> {
  const { key } = profileForUrl(manifestUrl);
  const upstream = await fetchUpstream(manifestUrl, key, {
    timeoutMs: env.streamAuditTimeoutMs,
  });
  return typeof upstream.body === 'string' ? upstream.body : upstream.body.toString('utf8');
}

/**
 * Inspecciona master + playlist media (variante liviana) para clasificar señal.
 */
export async function probeManifestSignal(
  manifestUrl: string,
): Promise<{ signal: SignalKind; isHd: boolean }> {
  try {
    const masterText = await fetchManifestText(manifestUrl);
    if (!isValidM3u8Body(masterText)) return { signal: 'offline', isHd: false };

    let isHd = detectHdFromManifest(masterText);
    let signal = detectSignalFromManifest(masterText);

    if (masterText.includes('#EXT-X-STREAM-INF') && signal !== 'standby') {
      const variants = parseVariants(masterText, manifestUrl);
      if (variants.length > 0) {
        const lightest = [...variants].sort((a, b) => a.bandwidth - b.bandwidth)[0];
        try {
          const mediaText = await fetchManifestText(lightest.url);
          signal = detectSignalFromManifest(mediaText);
          if (detectHdFromManifest(mediaText)) isHd = true;
        } catch {
          /* conservar señal del master */
        }
      }
    }

    return { signal, isHd };
  } catch {
    return { signal: 'offline', isHd: false };
  }
}
