import type { FastifyInstance } from 'fastify';
import { getChannels } from '../services/catalog.service.js';
import {
  auditChannelNow,
  channelSortScore,
  getChannelAudit,
} from '../services/stream-auditor.service.js';
import type { PublicChannel, SignalKind } from '../types/channel.js';

function enrichAndSortChannels(channels: PublicChannel[]): PublicChannel[] {
  return channels
    .map((ch) => {
      const audit = getChannelAudit(ch.id);
      return audit ? { ...ch, audit } : ch;
    })
    .sort((a, b) => channelSortScore(b.audit) - channelSortScore(a.audit));
}

function filterBySignal(channels: PublicChannel[], signal: SignalKind): PublicChannel[] {
  return channels.filter((ch) => ch.audit?.signal === signal);
}

export async function channelsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/api/channels/:id/probe', async (request) => {
    const id = request.params.id.trim();
    const audit = await auditChannelNow(id);
    return { channelId: id, audit };
  });

  app.get<{ Querystring: { signal?: string } }>('/api/channels', async (request, reply) => {
    const { data, status } = getChannels();
    let channels = enrichAndSortChannels(data);

    const signal = request.query.signal?.trim().toLowerCase();
    if (signal === 'live' || signal === 'standby' || signal === 'offline') {
      channels = filterBySignal(channels, signal);
    }

    reply.header('X-Fuchibol-Cache', status);
    reply.header(
      'X-Fuchibol-Live-Count',
      String(filterBySignal(enrichAndSortChannels(data), 'live').length),
    );
    return channels;
  });
}
