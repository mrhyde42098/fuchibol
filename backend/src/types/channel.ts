export type SignalKind = 'live' | 'standby' | 'offline' | 'unknown';

export interface ChannelAudit {
  status: 'ok' | 'degraded' | 'unavailable';
  /** live = transmisión activa, standby = cartel/espera, offline = sin manifiesto */
  signal: SignalKind;
  latencyMs: number | null;
  isHd: boolean;
  lastChecked: string;
  failCount: number;
}

export interface PublicChannel {
  id: string;
  name: string;
  category: string;
  logo: string;
  backups?: string[];
  audit?: ChannelAudit;
}

/** Raw channel from scrapers before normalization */
export interface RawChannel {
  id: string;
  name: string;
  category: string;
  logo?: string;
  backups?: string[];
  source?: string;
  mirror?: string;
}
