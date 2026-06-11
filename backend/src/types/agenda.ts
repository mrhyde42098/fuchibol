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
  /** TheSportsDB idEvent cuando hay match */
  externalEventId?: string;
  tsdbLeague?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  /** Fin estimado o confirmado (ISO) — se oculta al pasar */
  endsAt?: string;
}
