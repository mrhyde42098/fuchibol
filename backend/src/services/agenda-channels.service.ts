import type { AgendaChannelOption, AgendaEvent } from '../types/agenda.js';

/** Categorías ESPN (PKPlay) → canales sugeridos */
const CATEGORY_CHANNELS: Record<string, AgendaChannelOption[]> = {
  'LIGA CO': [
    { channelId: 'premium-v2-winsports', name: 'Win Sports', quality: '1080p', url: '' },
    { channelId: 'premium-v2-winsports2', name: 'Win+ Fútbol', quality: '1080p', url: '' },
    { channelId: 'evento5', name: 'Caracol TV', quality: '720p', url: '' },
  ],
  'LIGA AR': [
    { channelId: 'premium-v2-tycsports', name: 'TyC Sports', quality: '1080p', url: '' },
    { channelId: 'espnar', name: 'ESPN AR', quality: '720p', url: '' },
  ],
  'LIGA MX': [
    { channelId: 'tudnmx', name: 'TUDN MX', quality: '720p', url: '' },
    { channelId: 'canal5mx', name: 'Canal 5 MX', quality: '720p', url: '' },
  ],
  LIBERTADORES: [
    { channelId: 'disney1', name: 'Disney+', quality: '720p', url: '' },
    { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
    { channelId: 'foxsports', name: 'Fox Sports', quality: '720p', url: '' },
  ],
  SUDAMERICANA: [
    { channelId: 'disney1', name: 'Disney+', quality: '720p', url: '' },
    { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
  ],
  LALIGA: [
    { channelId: 'laligahypermotion', name: 'LaLiga TV', quality: '720p', url: '' },
    { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
  ],
};

const SUGGESTED: { test: RegExp; channels: AgendaChannelOption[] }[] = [
  {
    test: /mlb|baseball/i,
    channels: [
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'espndeportes', name: 'ESPN Deportes', quality: '720p', url: '' },
      { channelId: 'foxsports', name: 'Fox Sports', quality: '720p', url: '' },
      { channelId: 'fs1usa', name: 'Fox Sports 1 USA', quality: '720p', url: '' },
    ],
  },
  {
    test: /nba|basketball/i,
    channels: [
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'nba1', name: 'NBA League Pass', quality: '720p', url: '' },
      { channelId: 'tvtvhd-espn', name: 'ESPN', quality: '720p', url: '' },
    ],
  },
  {
    test: /nhl|hockey/i,
    channels: [
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'fs1usa', name: 'Fox Sports 1', quality: '720p', url: '' },
    ],
  },
  {
    test: /world cup|fifa|mundial/i,
    channels: [
      { channelId: 'disney1', name: 'Disney+', quality: '720p', url: '' },
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'foxsports', name: 'Fox Sports', quality: '720p', url: '' },
      { channelId: 'premium-v2-foxsports', name: 'Fox Sports', quality: '720p', url: '' },
      { channelId: 'tvtvhd-foxsports', name: 'Fox Sports', quality: '720p', url: '' },
    ],
  },
  {
    test: /la liga|laliga|spain|españa|spanish league/i,
    channels: [
      { channelId: 'laligahypermotion', name: 'LaLiga TV', quality: '720p', url: '' },
      { channelId: 'premium-v2-laligatvbar', name: 'LaLigaTV BAR', quality: '720p', url: '' },
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
    ],
  },
  {
    test: /liga mx|mexico|mexican|liga bbva mx|mexicana/i,
    channels: [
      { channelId: 'tudnmx', name: 'TUDN MX', quality: '720p', url: '' },
      { channelId: 'canal5mx', name: 'Canal 5 MX', quality: '720p', url: '' },
      { channelId: 'azteca7', name: 'Azteca 7', quality: '720p', url: '' },
      { channelId: 'premium-v2-tudn_mx', name: 'TUDN', quality: '720p', url: '' },
    ],
  },
  {
    test: /colombia|betplay|dimayor|liga betplay|colombian|liga co|primera a|atletico nacional|atléti/i,
    channels: [
      { channelId: 'premium-v2-winsports', name: 'Win Sports', quality: '1080p', url: '' },
      { channelId: 'premium-v2-winsports2', name: 'Win+ Fútbol', quality: '1080p', url: '' },
      { channelId: 'tvtvhd-winsports2', name: 'Win Sports', quality: '720p', url: '' },
      { channelId: 'evento5', name: 'Caracol TV', quality: '720p', url: '' },
      { channelId: 'evento6', name: 'Deportes RCN', quality: '720p', url: '' },
    ],
  },
  {
    test: /libertadores|sudamericana|copa libertadores/i,
    channels: [
      { channelId: 'disney1', name: 'Disney+', quality: '720p', url: '' },
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'foxsports', name: 'Fox Sports', quality: '720p', url: '' },
      { channelId: 'premium-v2-foxsports', name: 'Fox Sports', quality: '720p', url: '' },
    ],
  },
  {
    test: /argentin|liga profesional|liga ar|tyc/i,
    channels: [
      { channelId: 'premium-v2-tycsports', name: 'TyC Sports', quality: '1080p', url: '' },
      { channelId: 'tycsports', name: 'TyC Sports', quality: '720p', url: '' },
      { channelId: 'espnar', name: 'ESPN AR', quality: '720p', url: '' },
      { channelId: 'dsportsar', name: 'DSports AR', quality: '720p', url: '' },
      { channelId: 'premium-v2-telefe', name: 'Telefe', quality: '720p', url: '' },
    ],
  },
  {
    test: /peru|perú|liga 1 peru|golperu/i,
    channels: [
      { channelId: 'tvtvhd-golperu', name: 'GOLPERU', quality: '720p', url: '' },
      { channelId: 'tvtvhd-liga1max', name: 'Liga1 MAX', quality: '720p', url: '' },
      { channelId: 'premium-v2-liga1max', name: 'Liga1 MAX', quality: '720p', url: '' },
      { channelId: 'tvtvhd-movistar', name: 'Movistar', quality: '720p', url: '' },
    ],
  },
  {
    test: /brasil|brazil|brasileir|paulista|libertadores/i,
    channels: [
      { channelId: 'sporttvbr1', name: 'SportTV BR', quality: '720p', url: '' },
      { channelId: 'tvtvhd-sportv', name: 'SporTV', quality: '720p', url: '' },
      { channelId: 'premium-v2-espnpremium', name: 'ESPN Premium', quality: '720p', url: '' },
    ],
  },
  {
    test: /champions|uefa|europa league|premier league|serie a|bundesliga|ligue 1/i,
    channels: [
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'foxsports', name: 'Fox Sports', quality: '720p', url: '' },
      { channelId: 'disney1', name: 'Disney+', quality: '720p', url: '' },
    ],
  },
  {
    test: /usa|mls|major league soccer|concacaf/i,
    channels: [
      { channelId: 'espn', name: 'ESPN', quality: '720p', url: '' },
      { channelId: 'espndeportes', name: 'ESPN Deportes', quality: '720p', url: '' },
      { channelId: 'foxdeportes', name: 'Fox Deportes', quality: '720p', url: '' },
      { channelId: 'fs1usa', name: 'Fox Sports 1', quality: '720p', url: '' },
    ],
  },
];

/** Ligas menores sin audiencia LATAM — no mostrar en agenda sin enlaces propios */
const OBSCURE_LEAGUE =
  /austrian|irish premier|regionalliga|friendlies|u19|u21|youth|reserve|women|amateur|tercera|division 2/i;

function eventHaystack(ev: AgendaEvent): string {
  return `${ev.title} ${ev.tsdbLeague ?? ''} ${ev.category} ${ev.channelName ?? ''}`;
}

export function suggestChannelsForEvent(ev: AgendaEvent): AgendaChannelOption[] {
  const hay = eventHaystack(ev);
  const seen = new Set<string>();
  const result: AgendaChannelOption[] = [];

  const push = (ch: AgendaChannelOption) => {
    if (seen.has(ch.channelId)) return;
    seen.add(ch.channelId);
    result.push(ch);
  };

  for (const opt of ev.channels ?? []) {
    push(opt);
  }

  for (const ch of CATEGORY_CHANNELS[ev.category] ?? []) {
    push(ch);
  }

  for (const rule of SUGGESTED) {
    if (!rule.test.test(hay)) continue;
    for (const ch of rule.channels) push(ch);
  }

  return result;
}

export function attachSuggestedChannels(ev: AgendaEvent): AgendaEvent {
  const channels = suggestChannelsForEvent(ev);
  if (channels.length === 0) return ev;

  return {
    ...ev,
    channels,
    channelId: ev.channelId ?? channels[0].channelId,
    channelName: ev.channelName ?? channels.map((c) => c.name).join(', '),
  };
}

export function isAgendaEventRelevant(ev: AgendaEvent): boolean {
  if ((ev.channels?.length ?? 0) > 0 || ev.channelId) return true;

  const hay = eventHaystack(ev);
  if (OBSCURE_LEAGUE.test(hay)) return false;

  if (/^LIGA |^LIBERTADORES|^SUDAMERICANA|^CHAMPIONS|^MLS|^MLB|^NBA|^NHL|^LALIGA/i.test(ev.category)) {
    return true;
  }

  return SUGGESTED.some((rule) => rule.test.test(hay));
}
