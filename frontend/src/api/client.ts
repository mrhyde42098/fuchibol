import { API_BASE } from '../config';
import type { AgendaEvent, Channel, ChannelProbeResponse, StreamUrlResponse } from '../types';

const DEFAULT_TIMEOUT_MS = 25_000;

async function fetchJson<T>(path: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json() as { message?: string };
        if (body.message) message = body.message;
      } catch {
        const text = await res.text().catch(() => '');
        if (text) message = text;
      }
      throw new Error(message);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado. El servidor puede estar iniciando.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function getChannels(): Promise<Channel[]> {
  return fetchJson<Channel[]>('/channels');
}

export function getAgenda(): Promise<AgendaEvent[]> {
  return fetchJson<AgendaEvent[]>('/agenda');
}

export function getStreamUrl(channelId: string): Promise<StreamUrlResponse> {
  return fetchJson<StreamUrlResponse>(`/stream-url?id=${encodeURIComponent(channelId)}`, 45_000);
}

export function probeChannel(channelId: string): Promise<ChannelProbeResponse> {
  return fetchJson<ChannelProbeResponse>(`/channels/${encodeURIComponent(channelId)}/probe`, 45_000);
}
