import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { env } from './config/env.js';
import { validateEnvOrExit } from './config/validate-env.js';
import { registerOpenCors } from './middleware/cors.js';
import { registerErrorHandler } from './middleware/error-handler.js';
import { agendaRoutes } from './routes/agenda.routes.js';
import { channelsRoutes } from './routes/channels.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { proxyRoutes } from './routes/proxy.routes.js';
import { streamRoutes } from './routes/stream.routes.js';
import { startCatalogCaches, stopCatalogCaches } from './services/catalog.service.js';
import {
  startMirrorRefreshScheduler,
  stopMirrorRefreshScheduler,
  warmMirrorCache,
} from './services/iptv-mirror.service.js';
import { startStreamAuditor, stopStreamAuditor } from './services/stream-auditor.service.js';
import { logger } from './utils/logger.js';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

  await app.register(rateLimit, {
    global: true,
    max: env.rateLimitMax,
    timeWindow: '1 minute',
    allowList: ['127.0.0.1', '::1'],
  });

  await app.register(healthRoutes);
  await app.register(agendaRoutes);

  await app.register(async (scoped) => {
    await scoped.register(rateLimit, {
      max: env.rateLimitProbeMax,
      timeWindow: '1 minute',
    });
    await scoped.register(channelsRoutes);
  });

  await app.register(async (scoped) => {
    await scoped.register(rateLimit, {
      max: env.rateLimitStreamMax,
      timeWindow: '1 minute',
    });
    await scoped.register(streamRoutes);
  });

  await app.register(async (scoped) => {
    await scoped.register(rateLimit, {
      max: env.rateLimitProxyMax,
      timeWindow: '1 minute',
    });
    await scoped.register(proxyRoutes);
  });

  if (env.serveFrontend) {
    const distPath = resolve(backendRoot, env.frontendDistPath);
    await app.register(fastifyStatic, {
      root: distPath,
      prefix: '/',
      wildcard: false,
    });

    app.setNotFoundHandler((request, reply) => {
      if (request.url.startsWith('/api')) {
        return reply.status(404).send({ error: true, message: 'Not found' });
      }
      return reply.sendFile('index.html', distPath);
    });

    logger.info({ distPath }, 'Serving frontend static files');
  }

  return app;
}

async function main() {
  validateEnvOrExit();

  await startCatalogCaches();
  await warmMirrorCache();
  startMirrorRefreshScheduler();
  await startStreamAuditor();

  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    stopCatalogCaches();
    stopMirrorRefreshScheduler();
    stopStreamAuditor();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    logger.info(
      {
        port: env.port,
        baseUrl: env.publicBaseUrl,
        serveFrontend: env.serveFrontend,
        tokenTtlMin: Math.round(env.tokenTtlMs / 60_000),
      },
      'Fuchibol backend started',
    );
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

main();
