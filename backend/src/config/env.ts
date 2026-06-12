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
  cacheAgendaTtlMs: num('CACHE_AGENDA_TTL_MS', 90_000),
  tokenTtlMs: num('TOKEN_TTL_MS', 7_200_000),
  serveFrontend: str('SERVE_FRONTEND', 'false') === 'true',
  frontendDistPath: str('FRONTEND_DIST_PATH', '../frontend/dist'),
  rateLimitMax: num('RATE_LIMIT_MAX', 300),
  rateLimitStreamMax: num('RATE_LIMIT_STREAM_MAX', 40),
  rateLimitProxyMax: num('RATE_LIMIT_PROXY_MAX', 600),
  rateLimitProbeMax: num('RATE_LIMIT_PROBE_MAX', 20),
  streamResolveCacheMs: num('STREAM_RESOLVE_CACHE_MS', 60_000),
  logLevel: str('LOG_LEVEL', 'info'),
  defaultUserAgent: str(
    'DEFAULT_USER_AGENT',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ),
  fallbackChannelsPath: str('FALLBACK_CHANNELS_PATH', 'golea-analysis/channels.json'),
  fallbackAgendaPath: str('FALLBACK_AGENDA_PATH', 'golea-analysis/agenda.json'),
  streamAuditEnabled: str('STREAM_AUDIT_ENABLED', 'true') !== 'false',
  streamAuditPriorityIntervalMs: num('STREAM_AUDIT_PRIORITY_INTERVAL_MS', 90_000),
  streamAuditBackgroundIntervalMs: num('STREAM_AUDIT_BACKGROUND_INTERVAL_MS', 45_000),
  streamAuditBackgroundBatch: num('STREAM_AUDIT_BACKGROUND_BATCH', 6),
  streamAuditConcurrency: num('STREAM_AUDIT_CONCURRENCY', 3),
  streamAuditTimeoutMs: num('STREAM_AUDIT_TIMEOUT_MS', 12_000),
  streamAuditDegradedMs: num('STREAM_AUDIT_DEGRADED_MS', 4_000),
  streamAuditFailThreshold: num('STREAM_AUDIT_FAIL_THRESHOLD', 3),
  streamAuditBackoffMs: num('STREAM_AUDIT_BACKOFF_MS', 600_000),
  thesportsdbEnabled: str('THESPORTSDB_ENABLED', 'true') !== 'false',
  thesportsdbApiKey: str('THESPORTSDB_API_KEY', '3'),
  thesportsdbCacheMs: num('THESPORTSDB_CACHE_MS', 180_000),
  thesportsdbTimeoutMs: num('THESPORTSDB_TIMEOUT_MS', 12_000),
  thesportsdbRequestDelayMs: num('THESPORTSDB_REQUEST_DELAY_MS', 700),
  /** true = solo 1–4 peticiones por refresh (recomendado en plan gratuito) */
  thesportsdbMinimalMode: str('THESPORTSDB_MINIMAL_MODE', 'true') !== 'false',
  espnAgendaEnabled: str('ESPN_AGENDA_ENABLED', 'true') !== 'false',
  futbolLibreEnabled: str('FUTBOL_LIBRE_ENABLED', 'true') !== 'false',
  iptvMirrorEnabled: str('IPTV_MIRROR_ENABLED', 'true') !== 'false',
  iptvMirrorCacheMs: num('IPTV_MIRROR_CACHE_MS', 21_600_000),
  iptvMirrorTimeoutMs: num('IPTV_MIRROR_TIMEOUT_MS', 15_000),
  iptvMirrorMaxPerChannel: num('IPTV_MIRROR_MAX_PER_CHANNEL', 4),
  iptvMirrorPlaylistUrls: str('IPTV_MIRROR_PLAYLIST_URLS', ''),
  profiles: {
    streamXhd: {
      origin: str('PROFILE_STREAM_XHD_ORIGIN', 'https://stream-xhd.com'),
      referer: str('PROFILE_STREAM_XHD_REFERER', 'https://stream-xhd.com/'),
    },
    pelotaLibre: {
      origin: str('PROFILE_PELOTALIBRE_ORIGIN', 'https://pelotalibrestv.org'),
      referer: str('PROFILE_PELOTALIBRE_REFERER', 'https://pelotalibrestv.org/'),
    },
    futbolLibre: {
      origin: str('PROFILE_FUTBOL_LIBRE_ORIGIN', 'https://futbol-libres.su'),
      referer: str('PROFILE_FUTBOL_LIBRE_REFERER', 'https://futbol-libres.su/'),
    },
    latamvidz: {
      origin: str('PROFILE_LATAMVIDZ_ORIGIN', 'https://futbol-libres.su'),
      referer: str('PROFILE_LATAMVIDZ_REFERER', 'https://futbol-libres.su/'),
    },
    la18hd: {
      origin: str('PROFILE_LA18HD_ORIGIN', 'https://la18hd.com'),
      referer: str('PROFILE_LA18HD_REFERER', 'https://la18hd.com/'),
    },
    tvtvhd: {
      origin: str('PROFILE_TVTVHD_ORIGIN', 'https://tvtvhd.com'),
      referer: str('PROFILE_TVTVHD_REFERER', 'https://tvtvhd.com/'),
    },
    thetvapp: {
      origin: str('PROFILE_THETVAPP_ORIGIN', 'https://thetvapp.to'),
      referer: str('PROFILE_THETVAPP_REFERER', 'https://thetvapp.to/'),
    },
  },
} as const;
