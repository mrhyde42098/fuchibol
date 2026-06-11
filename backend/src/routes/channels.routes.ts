import type { FastifyInstance } from 'fastify';
import { getChannels } from '../services/catalog.service.js';
import { channelSortScore, getChannelAudit } from '../services/stream-auditor.service.js';
import type { PublicChannel } from '../types/channel.js';

function enrichAndSortChannels(channels: PublicChannel[]): PublicChannel[] {
  return channels
    .map((ch) => {
      const audit = getChannelAudit(ch.id);
      return audit ? { ...ch, audit } : ch;
    })
    .sort((a, b) => channelSortScore(b.audit) - channelSortScore(a.audit));
}

export async function channelsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/channels', async (_request, reply) => {
    const { data, status } = getChannels();
    reply.header('X-Fuchibol-Cache', status);
    return enrichAndSortChannels(data);
  });
}
