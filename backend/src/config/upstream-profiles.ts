import { env } from './env.js';

export type ProfileKey =
  | 'streamXhd'
  | 'pelotaLibre'
  | 'futbolLibre'
  | 'latamvidz'
  | 'la18hd'
  | 'tvtvhd'
  | 'thetvapp'
  | 'cdn'
  | 'default';

export interface UpstreamProfile {
  origin: string;
  referer: string;
  userAgent: string;
}

const profiles: Record<ProfileKey, UpstreamProfile> = {
  streamXhd: { ...env.profiles.streamXhd, userAgent: env.defaultUserAgent },
  pelotaLibre: { ...env.profiles.pelotaLibre, userAgent: env.defaultUserAgent },
  futbolLibre: { ...env.profiles.futbolLibre, userAgent: env.defaultUserAgent },
  latamvidz: { ...env.profiles.latamvidz, userAgent: env.defaultUserAgent },
  la18hd: { ...env.profiles.la18hd, userAgent: env.defaultUserAgent },
  tvtvhd: { ...env.profiles.tvtvhd, userAgent: env.defaultUserAgent },
  thetvapp: { ...env.profiles.thetvapp, userAgent: env.defaultUserAgent },
  cdn: {
    origin: env.profiles.streamXhd.origin,
    referer: env.profiles.streamXhd.referer,
    userAgent: env.defaultUserAgent,
  },
  default: {
    origin: env.profiles.streamXhd.origin,
    referer: env.profiles.streamXhd.referer,
    userAgent: env.defaultUserAgent,
  },
};

export function profileForUrl(url: string): { key: ProfileKey; profile: UpstreamProfile } {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('stream-xhd')) return { key: 'streamXhd', profile: profiles.streamXhd };
    if (host.includes('pelotalibre')) return { key: 'pelotaLibre', profile: profiles.pelotaLibre };
    if (host.includes('futbol-libres')) return { key: 'futbolLibre', profile: profiles.futbolLibre };
    if (host.includes('latamvidz') || host.includes('vivolatamz')) {
      return { key: 'latamvidz', profile: profiles.latamvidz };
    }
    if (host.includes('la18hd')) return { key: 'la18hd', profile: profiles.la18hd };
    if (host.includes('tvtvhd')) return { key: 'tvtvhd', profile: profiles.tvtvhd };
    if (host.includes('thetvapp')) return { key: 'thetvapp', profile: profiles.thetvapp };
    if (host.includes('newkso.ru')) return { key: 'thetvapp', profile: profiles.thetvapp };
    if (host.includes('skylivehd') || host.includes('khala.')) return { key: 'cdn', profile: profiles.cdn };
  } catch {
    /* invalid url */
  }
  return { key: 'default', profile: profiles.default };
}

export function profileByKey(key: ProfileKey): UpstreamProfile {
  return profiles[key] ?? profiles.default;
}
