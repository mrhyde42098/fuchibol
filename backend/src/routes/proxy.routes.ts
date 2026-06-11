import type { FastifyInstance } from 'fastify';
import { OPEN_CORS_HEADERS } from '../middleware/cors.js';
import { AppError } from '../errors/app-error.js';
import { proxyManifest, proxySegment } from '../proxy/hls-proxy.service.js';

function applyOpenCors(reply: { header: (k: string, v: string) => void }): void {
  for (const [key, value] of Object.entries(OPEN_CORS_HEADERS)) {
    reply.header(key, value);
  }
}

export async function proxyRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { s?: string } }>('/api/proxy/manifest', async (request, reply) => {
    applyOpenCors(reply);
    const token = request.query.s?.trim();
    if (!token) {
      throw new AppError('BAD_REQUEST', 'Parámetro s requerido', 400);
    }

    const { body, contentType } = await proxyManifest(token);
    reply.header('Content-Type', contentType);
    reply.header('X-Fuchibol-Proxy-Type', 'manifest');
    return reply.send(body);
  });

  app.get<{ Querystring: { s?: string } }>('/api/proxy/segment', async (request, reply) => {
    applyOpenCors(reply);
    const token = request.query.s?.trim();
    if (!token) {
      throw new AppError('BAD_REQUEST', 'Parámetro s requerido', 400);
    }

    const { body, contentType } = await proxySegment(token);
    reply.header('Content-Type', contentType);
    reply.header('X-Fuchibol-Proxy-Type', 'segment');
    reply.header('Cache-Control', 'public, max-age=60');
    return reply.send(body);
  });

  app.options('/api/proxy/manifest', async (_request, reply) => {
    applyOpenCors(reply);
    return reply.status(204).send();
  });

  app.options('/api/proxy/segment', async (_request, reply) => {
    applyOpenCors(reply);
    return reply.status(204).send();
  });
}
