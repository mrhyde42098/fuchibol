import type { FastifyInstance } from 'fastify';

const OPEN_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Type',
};

export function registerOpenCors(app: FastifyInstance): void {
  app.addHook('onRequest', async (request, reply) => {
    if (!request.url.startsWith('/api/proxy/')) return;

    for (const [key, value] of Object.entries(OPEN_CORS_HEADERS)) {
      reply.header(key, value);
    }

    if (request.method === 'OPTIONS') {
      reply.status(204).send();
    }
  });
}

export { OPEN_CORS_HEADERS };
