import type { AgendaEvent, Channel } from '../types';

const POPULAR_SLUGS = new Set([
  'espn', 'espn2', 'espn3', 'espnar', 'espndeportes', 'premium-v2-dsports',
  'premium-v2-foxsports', 'premium-v2-tycsports', 'premium-v2-tntsports',
  'tycsports', 'dsportsar', 'disney1', 'foxsports', 'tvtvhd-espn',
]);

export function isLiveAgendaStatus(status: string): boolean {
  const s = status.toUpperCase();
  return s.includes('VIVO') || s.includes('LIVE') || s.includes('EN CURSO');
}

export function channelQualityScore(ch: Channel): number {
  const audit = ch.audit;
  if (!audit) return 0;
  if (audit.status === 'unavailable') return -100;
  if (audit.status === 'degraded') return 20;
  let score = 60;
  if (audit.isHd) score += 25;
  if (audit.latencyMs != null) score += Math.max(0, 15 - Math.floor(audit.latencyMs / 300));
  return score;
}

export function isChannelOnline(ch: Channel): boolean {
  return ch.audit?.status === 'ok';
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
    .filter((ch) => ch.audit?.status !== 'unavailable')
    .map((ch) => {
      let boost = channelQualityScore(ch);
      if (liveIds.has(ch.id)) boost += 50;
      if (POPULAR_SLUGS.has(ch.id)) boost += 15;
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
    if (result.length >= 14) break;
  }

  return result;
}

export function groupChannelsByCategory(channels: Channel[], tab: string): Channel[] {
  const filtered = channels.filter((ch) => {
    if (tab === 'Canales') return !['Latam', 'Internacional'].includes(ch.category);
    return ch.category === tab;
  });

  return [...filtered].sort((a, b) => channelQualityScore(b) - channelQualityScore(a));
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
