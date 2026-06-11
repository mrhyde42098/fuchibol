import type { FastifyInstance } from 'fastify';
import { getAgenda } from '../services/catalog.service.js';

export async function agendaRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/agenda', async (_request, reply) => {
    const { data, status } = getAgenda();
    reply.header('X-Fuchibol-Cache', status);
    return data;
  });
}
