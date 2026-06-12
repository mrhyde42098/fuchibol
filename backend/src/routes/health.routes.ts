import type { FastifyInstance } from 'fastify';
import { env } from '../config/env.js';
import { getCacheHealth } from '../services/catalog.service.js';
import { getMirrorCacheMeta } from '../services/iptv-mirror.service.js';
import { getAuditorHealth } from '../services/stream-auditor.service.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'fuchibol-backend',
    cache: getCacheHealth(),
    auditor: getAuditorHealth(),
    iptvMirrors: {
      enabled: env.iptvMirrorEnabled,
      ...getMirrorCacheMeta(),
    },
    timestamp: new Date().toISOString(),
  }));
}
