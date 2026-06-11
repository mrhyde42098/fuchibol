import { profileForUrl } from '../config/upstream-profiles.js';
import { logger } from '../utils/logger.js';
import { fetchUpstream } from './upstream-client.js';

interface Variant {
  url: string;
  bandwidth: number;
  height: number;
}

function parseVariants(manifestText: string, baseUrl: string): Variant[] {
  const lines = manifestText.split(/\r?\n/);
  const variants: Variant[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('#EXT-X-STREAM-INF')) continue;

    const bwMatch = line.match(/BANDWIDTH=(\d+)/i);
    const resMatch = line.match(/RESOLUTION=(\d+)x(\d+)/i);
    const next = lines[i + 1]?.trim();
    if (!next || next.startsWith('#')) continue;

    try {
      variants.push({
        url: new URL(next, baseUrl).toString(),
        bandwidth: bwMatch ? Number(bwMatch[1]) : 0,
        height: resMatch ? Number(resMatch[2]) : 0,
      });
    } catch {
      /* skip invalid */
    }
  }

  return variants;
}

function bestVariant(variants: Variant[]): Variant {
  return [...variants].sort((a, b) => b.height - a.height || b.bandwidth - a.bandwidth)[0];
}

/**
 * Sigue master playlists anidados y devuelve el manifiesto de mayor resolución/bitrate.
 */
export async function pickHighestQualityManifest(manifestUrl: string, depth = 0): Promise<string> {
  if (depth > 4) return manifestUrl;

  try {
    const { key } = profileForUrl(manifestUrl);
    const upstream = await fetchUpstream(manifestUrl, key, { timeoutMs: 12_000 });
    const text = typeof upstream.body === 'string' ? upstream.body : upstream.body.toString('utf8');

    if (!text.includes('#EXT-X-STREAM-INF')) return manifestUrl;

    const variants = parseVariants(text, manifestUrl);
    if (variants.length === 0) return manifestUrl;

    const chosen = bestVariant(variants);
    logger.debug(
      { from: manifestUrl, chosen: chosen.url, height: chosen.height, bandwidth: chosen.bandwidth },
      'Selected HD variant'
    );

    return pickHighestQualityManifest(chosen.url, depth + 1);
  } catch (err) {
    logger.debug({ err, manifestUrl }, 'HD variant selection failed, using original');
    return manifestUrl;
  }
}
