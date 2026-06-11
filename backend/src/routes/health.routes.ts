import type { FastifyInstance } from 'fastify';
import { getCacheHealth } from '../services/catalog.service.js';
import { getAuditorHealth } from '../services/stream-auditor.service.js';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'fuchibol-backend',
    cache: getCacheHealth(),
    auditor: getAuditorHealth(),
    timestamp: new Date().toISOString(),
  }));
}
