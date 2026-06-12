export interface M3uEntry {
  name: string;
  url: string;
  tvgId?: string;
  group?: string;
  referer?: string;
  origin?: string;
  userAgent?: string;
}

export function parseM3uPlaylist(text: string): M3uEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: M3uEntry[] = [];
  let pending: Partial<M3uEntry> | null = null;
  let pendingReferer: string | undefined;
  let pendingOrigin: string | undefined;
  let pendingUserAgent: string | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      pendingReferer = line.split('=').slice(1).join('=').trim();
      continue;
    }
    if (line.startsWith('#EXTVLCOPT:http-origin=')) {
      pendingOrigin = line.split('=').slice(1).join('=').trim();
      continue;
    }
    if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      pendingUserAgent = line.split('=').slice(1).join('=').trim();
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
      const groupMatch = line.match(/group-title="([^"]*)"/i);
      pending = {
        name: nameMatch?.[1]?.trim() ?? 'Unknown',
        tvgId: tvgIdMatch?.[1],
        group: groupMatch?.[1],
        referer: pendingReferer,
        origin: pendingOrigin,
        userAgent: pendingUserAgent,
      };
      continue;
    }

    if (line.startsWith('#')) continue;

    if (pending && /^https?:\/\//i.test(line)) {
      entries.push({
        name: pending.name ?? 'Unknown',
        url: line,
        tvgId: pending.tvgId,
        group: pending.group,
        referer: pending.referer ?? pendingReferer,
        origin: pending.origin ?? pendingOrigin,
        userAgent: pending.userAgent ?? pendingUserAgent,
      });
      pending = null;
      pendingReferer = undefined;
      pendingOrigin = undefined;
      pendingUserAgent = undefined;
    }
  }

  return entries;
}
