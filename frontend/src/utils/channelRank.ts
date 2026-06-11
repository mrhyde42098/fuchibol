import type { AgendaEvent, Channel } from '../types';

const FEATURED_SLUGS = [
  'espn',
  'espn2',
  'espn3',
  'espndeportes',
  'foxsports',
  'premium-v2-foxsports',
  'tvtvhd-foxsports',
  'dsports',
  'premium-v2-dsports',
  'tvtvhd-dsports',
  'tycsports',
  'premium-v2-tycsports',
  'tvtvhd-tycsports',
  'tntsports',
  'premium-v2-tntsports',
  'disney1',
  'disney2',
  'espnar',
  'dsportsar',
  'foxdeportes',
  'espnpremium',
  'premium-v2-espnpremium',
];

function slugOf(channel: Channel): string {
  return channel.id.toLowerCase().replace(/^premium-v2-|^tvtvhd-/, '');
}

export function isChannelOnline(channel: Channel): boolean {
  return channel.audit?.status === 'ok' || channel.audit?.status === 'degraded';
}

export function isFeaturedChannel(channel: Channel): boolean {
  const id = channel.id.toLowerCase();
  return FEATURED_SLUGS.some((s) => id === s || id.endsWith(s) || slugOf(channel).includes(s));
}

export function channelQualityScore(channel: Channel): number {
  const audit = channel.audit;
  if (!audit) return 40;
  if (audit.status === 'unavailable') return 0;
  if (audit.status === 'degraded') return 30;
  const hd = audit.isHd ? 25 : 0;
  const latency = audit.latencyMs != null ? Math.max(0, 20 - Math.floor(audit.latencyMs / 150)) : 10;
  const featured = isFeaturedChannel(channel) ? 15 : 0;
  return 50 + hd + latency + featured;
}

export function getLiveNowChannels(channels: Channel[], agenda: AgendaEvent[]): Channel[] {
  const liveIds = new Set<string>();

  for (const ev of agenda) {
    const live = /vivo|live|curso|ahora/i.test(ev.status);
    if (!live) continue;
    if (ev.channelId) liveIds.add(ev.channelId);
    ev.channels?.forEach((c) => liveIds.add(c.channelId));
  }

  const online = channels.filter(isChannelOnline);
  const picked = new Map<string, Channel>();

  for (const ch of online) {
    if (isFeaturedChannel(ch) || liveIds.has(ch.id)) {
      picked.set(ch.id, ch);
    }
  }

  for (const ch of online) {
    if (picked.size >= 14) break;
    if (!picked.has(ch.id) && ch.audit?.status === 'ok') {
      picked.set(ch.id, ch);
    }
  }

  return Array.from(picked.values()).sort((a, b) => channelQualityScore(b) - channelQualityScore(a));
}

export type ChannelGroup = { label: string; channels: Channel[] };

const GROUP_RULES: { label: string; test: (ch: Channel) => boolean }[] = [
  { label: 'Fútbol & Ligas', test: (ch) => /liga|fifa|mundial|tyc|gol|premiere|campeones|hyper/i.test(`${ch.name} ${ch.id}`) },
  { label: 'ESPN & Disney', test: (ch) => /espn|disney|star\+|starplus/i.test(ch.name) },
  { label: 'Fox & TNT', test: (ch) => /fox|tnt|usa network/i.test(ch.name) },
  { label: 'DSports & Win', test: (ch) => /dsport|win sport|movistar/i.test(ch.name) },
  { label: 'México & USA', test: (ch) => /mx|usa|tudn|telemundo|univision|azteca|vix|peacock|paramount/i.test(`${ch.name} ${ch.id}`) },
  { label: 'Brasil', test: (ch) => /sportv|premiere|cazé|globo|br/i.test(`${ch.name} ${ch.id}`) },
];

export function groupChannels(channels: Channel[]): ChannelGroup[] {
  const used = new Set<string>();
  const groups: ChannelGroup[] = [];

  for (const rule of GROUP_RULES) {
    const list = channels.filter((ch) => !used.has(ch.id) && rule.test(ch));
    if (list.length === 0) continue;
    list.forEach((ch) => used.add(ch.id));
    groups.push({
      label: rule.label,
      channels: list.sort((a, b) => channelQualityScore(b) - channelQualityScore(a)),
    });
  }

  const rest = channels.filter((ch) => !used.has(ch.id));
  if (rest.length > 0) {
    groups.push({
      label: 'Más canales',
      channels: rest.sort((a, b) => channelQualityScore(b) - channelQualityScore(a)),
    });
  }

  return groups;
}

export function isAgendaLive(status: string): boolean {
  return /vivo|live|curso|ahora/i.test(status);
}

export function agendaSortKey(ev: AgendaEvent): number {
  if (isAgendaLive(ev.status)) return 0;
  if (/proximo|soon|pendiente/i.test(ev.status)) return 1;
  return 2;
}
