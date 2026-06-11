import { API_BASE } from '../config';
import type { AgendaEvent, Channel, StreamUrlResponse } from '../types';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getChannels(): Promise<Channel[]> {
  return fetchJson<Channel[]>('/channels');
}

export function getAgenda(): Promise<AgendaEvent[]> {
  return fetchJson<AgendaEvent[]>('/agenda');
}

export function getStreamUrl(channelId: string): Promise<StreamUrlResponse> {
  return fetchJson<StreamUrlResponse>(`/stream-url?id=${encodeURIComponent(channelId)}`);
}
