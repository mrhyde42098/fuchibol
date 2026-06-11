export interface ChannelAudit {
  status: 'ok' | 'degraded' | 'unavailable';
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
