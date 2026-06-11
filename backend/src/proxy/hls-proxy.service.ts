import { rewriteM3u8 } from './m3u8-rewriter.js';
import { fetchUpstream } from './upstream-client.js';
import { verifyToken } from '../services/token.service.js';
import type { ProfileKey } from '../config/upstream-profiles.js';

export async function proxyManifest(token: string): Promise<{ body: string; contentType: string }> {
  const payload = verifyToken(token, 'manifest');
  const upstream = await fetchUpstream(payload.url, payload.profile as ProfileKey, {
    timeoutMs: 15_000,
  });

  const text = typeof upstream.body === 'string' ? upstream.body : upstream.body.toString('utf8');
  const rewritten = rewriteM3u8(text, payload.url);

  return {
    body: rewritten,
    contentType: 'application/vnd.apple.mpegurl',
  };
}

export async function proxySegment(token: string): Promise<{ body: Buffer; contentType: string }> {
  const payload = verifyToken(token, 'segment');
  const upstream = await fetchUpstream(payload.url, payload.profile as ProfileKey, {
    binary: true,
    timeoutMs: 30_000,
  });

  const buffer = Buffer.isBuffer(upstream.body) ? upstream.body : Buffer.from(upstream.body as string);
  const contentType = upstream.contentType.includes('video')
    ? upstream.contentType
    : 'video/MP2T';

  return { body: buffer, contentType };
}
