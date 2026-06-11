import { profileByKey, profileForUrl, type ProfileKey, type UpstreamProfile } from '../config/upstream-profiles.js';
import { AppError } from '../errors/app-error.js';
import { env } from '../config/env.js';

export interface UpstreamResponse {
  body: string | Buffer;
  contentType: string;
  isBinary: boolean;
}

export async function fetchUpstream(
  url: string,
  profileKey?: ProfileKey,
  options: { binary?: boolean; timeoutMs?: number } = {}
): Promise<UpstreamResponse> {
  const { key, profile } = profileKey
    ? { key: profileKey, profile: profileByKey(profileKey) }
    : profileForUrl(url);

  void key;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: buildHeaders(profile),
    });

    if (response.status === 403) {
      throw new AppError('UPSTREAM_FORBIDDEN', 'Upstream rechazó la petición (403)', 502);
    }
    if (response.status === 404) {
      throw new AppError('UPSTREAM_ERROR', 'Recurso no encontrado en upstream (404)', 502);
    }
    if (!response.ok) {
      throw new AppError('UPSTREAM_ERROR', `Upstream respondió ${response.status}`, 502);
    }

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';

    if (options.binary) {
      const buffer = Buffer.from(await response.arrayBuffer());
      return { body: buffer, contentType, isBinary: true };
    }

    const text = await response.text();
    return { body: text, contentType, isBinary: false };
  } catch (err) {
    if (err instanceof AppError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new AppError('UPSTREAM_TIMEOUT', 'Timeout al contactar upstream', 504);
    }
    throw new AppError('UPSTREAM_ERROR', 'Error al contactar upstream', 502);
  } finally {
    clearTimeout(timeout);
  }
}

function buildHeaders(profile: UpstreamProfile): Record<string, string> {
  return {
    'User-Agent': profile.userAgent || env.defaultUserAgent,
    Accept: '*/*',
    Origin: profile.origin,
    Referer: profile.referer,
  };
}
