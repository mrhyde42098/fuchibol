import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import type { ProfileKey } from '../config/upstream-profiles.js';
import { AppError } from '../errors/app-error.js';

export type TokenType = 'manifest' | 'segment';

export interface TokenHeaderOverrides {
  referer?: string;
  origin?: string;
  userAgent?: string;
}

export interface TokenPayload {
  type: TokenType;
  url: string;
  profile: ProfileKey;
  exp: number;
  headers?: TokenHeaderOverrides;
}

function base64UrlEncode(data: string): string {
  return Buffer.from(data, 'utf8').toString('base64url');
}

function base64UrlDecode(data: string): string {
  return Buffer.from(data, 'base64url').toString('utf8');
}

function sign(payloadB64: string): string {
  return createHmac('sha256', env.tokenSecret).update(payloadB64).digest('base64url');
}

export function createToken(
  type: TokenType,
  url: string,
  profile: ProfileKey,
  ttlMs = env.tokenTtlMs,
  headers?: TokenHeaderOverrides,
): string {
  const payload: TokenPayload = {
    type,
    url,
    profile,
    exp: Date.now() + ttlMs,
    ...(headers && (headers.referer || headers.origin || headers.userAgent) ? { headers } : {}),
  };
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sig = sign(payloadB64);
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token: string, expectedType: TokenType): TokenPayload {
  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new AppError('TOKEN_INVALID', 'Token inválido', 400);
  }

  const [payloadB64, sig] = parts;
  const expectedSig = sign(payloadB64);

  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError('TOKEN_INVALID', 'Firma de token inválida', 400);
  }

  let payload: TokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;
  } catch {
    throw new AppError('TOKEN_INVALID', 'Payload de token inválido', 400);
  }

  if (payload.type !== expectedType) {
    throw new AppError('TOKEN_INVALID', 'Tipo de token incorrecto', 400);
  }

  if (Date.now() > payload.exp) {
    throw new AppError('TOKEN_EXPIRED', 'Token expirado', 401);
  }

  if (!payload.url?.startsWith('http')) {
    throw new AppError('TOKEN_INVALID', 'URL del token inválida', 400);
  }

  return payload;
}

export function buildProxyUrl(
  type: TokenType,
  url: string,
  profile: ProfileKey,
  headers?: TokenHeaderOverrides,
): string {
  const token = createToken(type, url, profile, env.tokenTtlMs, headers);
  const path = type === 'manifest' ? '/api/proxy/manifest' : '/api/proxy/segment';
  return `${env.publicBaseUrl}${path}?s=${encodeURIComponent(token)}`;
}
