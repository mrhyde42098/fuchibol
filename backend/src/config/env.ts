import { config } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../.env') });

function num(key: string, fallback: number): number {
  const v = process.env[key];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

export const env = {
  nodeEnv: str('NODE_ENV', 'development'),
  port: num('PORT', 4000),
  publicBaseUrl: str('PUBLIC_BASE_URL', 'http://localhost:4000').replace(/\/$/, ''),
  tokenSecret: str('TOKEN_SECRET', 'dev-secret-change-in-production-min-32-chars'),
  cacheChannelsTtlMs: num('CACHE_CHANNELS_TTL_MS', 600_000),
  cacheAgendaTtlMs: num('CACHE_AGENDA_TTL_MS', 300_000),
  tokenTtlMs: num('TOKEN_TTL_MS', 900_000),
  streamResolveCacheMs: num('STREAM_RESOLVE_CACHE_MS', 60_000),
  logLevel: str('LOG_LEVEL', 'info'),
  defaultUserAgent: str(
    'DEFAULT_USER_AGENT',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ),
  fallbackChannelsPath: str('FALLBACK_CHANNELS_PATH', 'golea-analysis/channels.json'),
  fallbackAgendaPath: str('FALLBACK_AGENDA_PATH', 'golea-analysis/agenda.json'),
  streamAuditEnabled: str('STREAM_AUDIT_ENABLED', 'true') !== 'false',
  streamAuditIntervalMs: num('STREAM_AUDIT_INTERVAL_MS', 300_000),
  streamAuditConcurrency: num('STREAM_AUDIT_CONCURRENCY', 4),
  streamAuditTimeoutMs: num('STREAM_AUDIT_TIMEOUT_MS', 12_000),
  streamAuditDegradedMs: num('STREAM_AUDIT_DEGRADED_MS', 4_000),
  streamAuditFailThreshold: num('STREAM_AUDIT_FAIL_THRESHOLD', 3),
  profiles: {
    streamXhd: {
      origin: str('PROFILE_STREAM_XHD_ORIGIN', 'https://stream-xhd.com'),
      referer: str('PROFILE_STREAM_XHD_REFERER', 'https://stream-xhd.com/'),
    },
    pelotaLibre: {
      origin: str('PROFILE_PELOTALIBRE_ORIGIN', 'https://pelotalibrestv.org'),
      referer: str('PROFILE_PELOTALIBRE_REFERER', 'https://pelotalibrestv.org/'),
    },
    la18hd: {
      origin: str('PROFILE_LA18HD_ORIGIN', 'https://la18hd.com'),
      referer: str('PROFILE_LA18HD_REFERER', 'https://la18hd.com/'),
    },
    tvtvhd: {
      origin: str('PROFILE_TVTVHD_ORIGIN', 'https://tvtvhd.com'),
      referer: str('PROFILE_TVTVHD_REFERER', 'https://tvtvhd.com/'),
    },
  },
} as const;
