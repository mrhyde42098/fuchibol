import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';
import { registerOpenCors } from './middleware/cors.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { agendaRoutes } from './routes/agenda.routes.js';
import { channelsRoutes } from './routes/channels.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { proxyRoutes } from './routes/proxy.routes.js';
import { streamRoutes } from './routes/stream.routes.js';
import { startCatalogCaches, stopCatalogCaches } from './services/catalog.service.js';
import { startStreamAuditor, stopStreamAuditor } from './services/stream-auditor.service.js';
import { logger } from './utils/logger.js';

async function buildApp() {
  const app = Fastify({
    logger: false,
    requestIdHeader: 'x-request-id',
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'OPTIONS'],
  });

  registerOpenCors(app);
  registerErrorHandler(app);

  await app.register(healthRoutes);
  await app.register(channelsRoutes);
  await app.register(agendaRoutes);
  await app.register(streamRoutes);
  await app.register(proxyRoutes);

  return app;
}

async function main() {
  await startCatalogCaches();
  await startStreamAuditor();

  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    stopCatalogCaches();
    stopStreamAuditor();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    logger.info({ port: env.port, baseUrl: env.publicBaseUrl }, 'Fuchibol backend started');
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
