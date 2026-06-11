export type SignalKind = 'live' | 'standby' | 'offline' | 'unknown';

export interface ChannelAudit {
  status: 'ok' | 'degraded' | 'unavailable';
  signal: SignalKind;
  latencyMs: number | null;
  isHd: boolean;
  lastChecked: string;
  failCount: number;
}

export interface Channel {
  id: string;
  name: string;
  category: string;
  logo: string;
  backups?: string[];
  audit?: ChannelAudit;
}

export interface AgendaChannelOption {
  name: string;
  quality?: string;
  url: string;
  channelId: string;
}

export interface AgendaEvent {
  title: string;
  time: string;
  category: string;
  language: string;
  status: string;
  date: string;
  dateLabel?: string;
  channelName?: string;
  link?: string;
  channelId: string | null;
  channels?: AgendaChannelOption[];
}

export interface StreamUrlResponse {
  proxyUrl: string;
  proxied: boolean;
  expiresInMs: number;
}

export interface ChannelProbeResponse {
  channelId: string;
  audit: ChannelAudit;
}
