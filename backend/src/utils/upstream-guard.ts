import { AppError } from '../errors/app-error.js';

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isPrivateIpv6(host: string): boolean {
  const h = host.toLowerCase();
  return h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd');
}

export function assertUpstreamUrlAllowed(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('UPSTREAM_ERROR', 'URL upstream inválida', 502);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new AppError('UPSTREAM_ERROR', 'Protocolo upstream no permitido', 502);
  }

  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host)) {
    throw new AppError('UPSTREAM_FORBIDDEN', 'Host upstream bloqueado', 502);
  }
  if (isPrivateIpv4(host) || isPrivateIpv6(host)) {
    throw new AppError('UPSTREAM_FORBIDDEN', 'Host upstream privado bloqueado', 502);
  }
}

const MAX_REDIRECTS = 5;

export async function fetchUpstreamSafe(
  url: string,
  init: RequestInit,
): Promise<Response> {
  let current = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    assertUpstreamUrlAllowed(current);
    const response = await fetch(current, { ...init, redirect: 'manual' });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) return response;
      current = new URL(location, current).toString();
      continue;
    }

    return response;
  }

  throw new AppError('UPSTREAM_ERROR', 'Demasiados redirects upstream', 502);
}
