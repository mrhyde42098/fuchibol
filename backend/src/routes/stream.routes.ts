import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { resolveStreamForChannel } from '../services/stream-resolver.service.js';

export async function streamRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { id?: string } }>('/api/stream-url', async (request) => {
    const id = request.query.id?.trim();
    if (!id) {
      throw new AppError('BAD_REQUEST', 'Parámetro id requerido', 400);
    }

    const result = await resolveStreamForChannel(id);
    return {
      proxyUrl: result.proxyUrl,
      proxied: true,
      expiresInMs: result.expiresInMs,
    };
  });
}
