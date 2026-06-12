import { env } from './env.js';

const DEV_SECRET = 'dev-secret-change-in-production-min-32-chars';

export function validateEnvOrExit(): void {
  const errors: string[] = [];

  if (env.nodeEnv === 'production') {
    if (!process.env.TOKEN_SECRET || env.tokenSecret === DEV_SECRET) {
      errors.push('TOKEN_SECRET debe definirse en producción (mín. 32 caracteres aleatorios).');
    } else if (env.tokenSecret.length < 32) {
      errors.push('TOKEN_SECRET demasiado corto (mínimo 32 caracteres).');
    }

    if (env.publicBaseUrl.includes('localhost') && !env.serveFrontend) {
      errors.push('PUBLIC_BASE_URL no puede ser localhost en producción sin SERVE_FRONTEND.');
    }
  }

  if (errors.length > 0) {
    console.error('[Fuchibol] Configuración inválida:\n', errors.map((e) => `  - ${e}`).join('\n'));
    process.exit(1);
  }
}
