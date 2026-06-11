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
