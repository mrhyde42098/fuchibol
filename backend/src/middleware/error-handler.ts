import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { logger } from '../utils/logger.js';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | AppError, _request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;

    if (error instanceof AppError) {
      reply.status(error.status).send(error.toJSON());
      return;
    }

    const status = error.statusCode ?? 500;
    logger.error({ err: error }, 'Unhandled error');

    reply.status(status).send({
      error: true,
      code: 'INTERNAL_ERROR',
      message: status >= 500 ? 'Error interno del servidor' : error.message,
      status,
    });
  });
}
