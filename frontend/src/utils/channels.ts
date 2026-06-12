import type { AgendaEvent, Channel } from '../types';

const POPULAR_SLUGS = new Set([
  'espn', 'espn2', 'espn3', 'espnar', 'espndeportes', 'premium-v2-dsports',
  'premium-v2-foxsports', 'premium-v2-tycsports', 'premium-v2-tntsports',
  'premium-v2-winsports', 'premium-v2-winsports2', 'tvtvhd-winsports2',
  'tycsports', 'dsportsar', 'disney1', 'foxsports', 'tvtvhd-espn',
]);

export const CHANNEL_GROUPS = [
  { id: 'premium', label: 'Premium HD', logoKey: 'premium' },
  { id: 'win', label: 'Win Sports', logoKey: 'winsports' },
  { id: 'espn', label: 'ESPN', logoKey: 'espn' },
  { id: 'fox', label: 'Fox Sports', logoKey: 'foxsports' },
  { id: 'streaming', label: 'Streaming', logoKey: 'disney1' },
  { id: 'mexico', label: 'México', logoKey: 'tudnmx' },
  { id: 'colombia', label: 'Colombia', logoKey: 'premium-v2-winsports' },
  { id: 'peru', label: 'Perú', logoKey: 'tvtvhd-golperu' },
  { id: 'argentina', label: 'Argentina', logoKey: 'premium-v2-tycsports' },
  { id: 'brasil', label: 'Brasil', logoKey: 'sporttvbr1' },
  { id: 'usa', label: 'USA', logoKey: 'fs1usa' },
  { id: 'otros', label: 'Más canales', logoKey: '' },
] as const;

export type ChannelGroupId = (typeof CHANNEL_GROUPS)[number]['id'];
export type TabCategory = 'Latam' | 'Internacional' | 'Canales';
export type SignalFilter = 'live' | 'all' | 'standby' | 'offline' | 'pending';

export const SIGNAL_FILTERS: { id: SignalFilter; label: string }[] = [
  { id: 'live', label: 'En línea' },
  { id: 'all', label: 'Todos' },
  { id: 'standby', label: 'En espera' },
  { id: 'offline', label: 'Sin señal' },
  { id: 'pending', label: 'Sin verificar' },
];

export function isLiveAgendaStatus(status: string): boolean {
  const s = status.toUpperCase();
  if (s.includes('FIN') || s.includes('FT')) return false;
  return s.includes('VIVO') || s.includes('LIVE') || s.includes('EN CURSO');
}

export function isFinishedAgendaStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s.includes('FIN') || s.includes('FT');
}

export function isChannelLiveSignal(ch: Channel): boolean {
  return ch.audit?.signal === 'live' && ch.audit.status !== 'unavailable';
}

export function isChannelStandby(ch: Channel): boolean {
  return ch.audit?.signal === 'standby';
}

export function isChannelOffline(ch: Channel): boolean {
  return ch.audit?.signal === 'offline' || ch.audit?.status === 'unavailable';
}

export function isChannelPendingAudit(ch: Channel): boolean {
  return !ch.audit?.signal || ch.audit.signal === 'unknown';
}

export function channelQualityScore(ch: Channel): number {
  const audit = ch.audit;
  if (!audit) return 5;
  if (audit.signal === 'offline' || audit.status === 'unavailable') return -100;
  if (audit.signal === 'standby') return 15;
  if (audit.signal === 'unknown') return 8;
  if (audit.status === 'degraded') return 35;
  let score = 65;
  if (audit.isHd) score += 25;
  if (audit.latencyMs != null) score += Math.max(0, 15 - Math.floor(audit.latencyMs / 300));
  return score;
}

export function isChannelOnline(ch: Channel): boolean {
  return isChannelLiveSignal(ch) && ch.audit?.status === 'ok';
}

export function filterChannelsBySignal(channels: Channel[], filter: SignalFilter): Channel[] {
  switch (filter) {
    case 'live':
      return channels.filter(isChannelLiveSignal);
    case 'standby':
      return channels.filter(isChannelStandby);
    case 'offline':
      return channels.filter(isChannelOffline);
    case 'pending':
      return channels.filter(isChannelPendingAudit);
    default:
      return channels;
  }
}

export function countChannelsBySignal(channels: Channel[]): Record<SignalFilter, number> {
  return {
    live: channels.filter(isChannelLiveSignal).length,
    all: channels.length,
    standby: channels.filter(isChannelStandby).length,
    offline: channels.filter(isChannelOffline).length,
    pending: channels.filter(isChannelPendingAudit).length,
  };
}

export function getChannelGroup(ch: Channel): ChannelGroupId {
  const hay = `${ch.id} ${ch.name}`.toLowerCase();

  if (/win\s*sport|winsport|winsports|win\+|winplus/.test(hay)) return 'win';
  if (/golperu|liga\s*1\s*max|liga1max|movistar.*pe|america\s*tv\s*pe/.test(hay)) return 'peru';
  if (/espn/.test(hay)) return 'espn';
  if (/fox\s*sport|foxdeportes|f2usa|fs1usa/.test(hay)) return 'fox';
  if (/disney|vix|paramount|peacock|amazon|prime/.test(hay)) return 'streaming';
  if (/tudn|azteca|canal\s*5|unimas|mex|_mx/.test(hay)) return 'mexico';
  if (/caracol|rcn|deportes\s*rcn|ligabetplay|betplay/.test(hay)) return 'colombia';
  if (/tyc|dsport|tnt\s*sport|telefe/.test(hay)) return 'argentina';
  if (/movistar/.test(hay) && !/pe/.test(hay)) return 'argentina';
  if (/sportv|premiere|caz[eé]tv|sporttv/.test(hay)) return 'brasil';
  if (/usa|telemundo|univision|mlb|nba|nhl/.test(hay)) return 'usa';
  if (/premium|tvtvhd/.test(hay)) return 'premium';
  return 'otros';
}

export function groupChannelsBySections(channels: Channel[], tab: string): Map<ChannelGroupId, Channel[]> {
  const filtered = channels.filter((ch) => {
    if (tab === 'Canales') return !['Latam', 'Internacional'].includes(ch.category);
    return ch.category === tab;
  });

  const sorted = [...filtered].sort((a, b) => channelQualityScore(b) - channelQualityScore(a));
  const map = new Map<ChannelGroupId, Channel[]>();

  for (const ch of sorted) {
    const g = getChannelGroup(ch);
    const list = map.get(g) ?? [];
    list.push(ch);
    map.set(g, list);
  }

  return map;
}

export function getLiveAgendaChannelIds(agenda: AgendaEvent[]): Set<string> {
  const ids = new Set<string>();
  for (const ev of agenda) {
    if (!isLiveAgendaStatus(ev.status)) continue;
    if (ev.channelId) ids.add(ev.channelId);
    ev.channels?.forEach((c) => ids.add(c.channelId));
  }
  return ids;
}

export function getFeaturedChannels(channels: Channel[], agenda: AgendaEvent[]): Channel[] {
  const liveIds = getLiveAgendaChannelIds(agenda);

  const scored = channels
    .filter((ch) => isChannelLiveSignal(ch))
    .map((ch) => {
      let boost = channelQualityScore(ch);
      if (liveIds.has(ch.id)) boost += 50;
      if (POPULAR_SLUGS.has(ch.id)) boost += 15;
      if (getChannelGroup(ch) === 'win') boost += 20;
      return { ch, boost };
    })
    .sort((a, b) => b.boost - a.boost);

  const seen = new Set<string>();
  const result: Channel[] = [];

  for (const { ch } of scored) {
    if (seen.has(ch.id)) continue;
    const key = ch.name.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) continue;
    seen.add(ch.id);
    seen.add(key);
    result.push(ch);
    if (result.length >= 32) break;
  }

  return result;
}

export function pickInitialChannel(channels: Channel[], agenda: AgendaEvent[]): Channel | undefined {
  const featured = getFeaturedChannels(channels, agenda);
  if (featured[0]) return featured[0];

  return (
    channels.find((c) => isChannelLiveSignal(c)) ??
    channels.find((c) => !isChannelOffline(c)) ??
    channels[0]
  );
}

export function groupChannelsByCategory(channels: Channel[], tab: string): Channel[] {
  const filtered = channels.filter((ch) => {
    if (tab === 'Canales') return !['Latam', 'Internacional'].includes(ch.category);
    return ch.category === tab;
  });

  return [...filtered].sort((a, b) => channelQualityScore(b) - channelQualityScore(a));
}

export function filterChannelsByQuery(channels: Channel[], query: string): Channel[] {
  const q = query.trim().toLowerCase();
  if (!q) return channels;
  return channels.filter(
    (ch) => ch.name.toLowerCase().includes(q) || ch.id.toLowerCase().includes(q),
  );
}

export function signalLabel(ch: Channel): string {
  if (isChannelLiveSignal(ch)) return ch.audit?.status === 'ok' ? 'EN VIVO' : 'EN VIVO · débil';
  if (isChannelStandby(ch)) return 'En espera';
  if (isChannelOffline(ch)) return 'Sin señal';
  return 'Verificando…';
}

export const SPORT_COLORS: Record<string, string> = {
  FIFA: '#00c853',
  MUNDIAL: '#ffd600',
  LALIGA: '#ff6d00',
  LALIGA2: '#ff9100',
  MLB: '#c62828',
  NBA: '#1d428a',
  NHL: '#000000',
  DEFAULT: '#0066ff',
};

export function sportColor(category: string): string {
  return SPORT_COLORS[category.toUpperCase()] ?? SPORT_COLORS.DEFAULT;
}
