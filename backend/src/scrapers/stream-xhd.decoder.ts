/**
 * Decodes obfuscated playbackURL embedded in stream-xhd.com player pages.
 * Variable names rotate per request; logic stays the same.
 */
export function decodeStreamXhdPlaybackUrl(html: string): string | null {
  const arrayMatch = html.match(/(\w+)=\s*(\[\[[\d]+,"[A-Za-z0-9+/=]+"[\s\S]*?\]\])\s*;\s*\1\.sort/);
  if (!arrayMatch) return null;

  let entries: [number, string][];
  try {
    entries = JSON.parse(arrayMatch[2].replace(/'/g, '"')) as [number, string][];
  } catch {
    return null;
  }

  const kLine = html.match(/var\s+k\s*=\s*(\w+)\(\)\s*\+\s*(\w+)\(\)/);
  if (!kLine) return null;

  const fnA = kLine[1];
  const fnB = kLine[2];
  const valA = html.match(new RegExp(`function\\s+${fnA}\\(\\)\\s*\\{\\s*return\\s+(\\d+)`))?.[1];
  const valB = html.match(new RegExp(`function\\s+${fnB}\\(\\)\\s*\\{\\s*return\\s+(\\d+)`))?.[1];
  if (!valA || !valB) return null;

  const k = Number(valA) + Number(valB);
  entries.sort((a, b) => a[0] - b[0]);

  let playbackUrl = '';
  for (const [, encoded] of entries) {
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const digits = decoded.replace(/\D/g, '');
    if (!digits) continue;
    const code = Number.parseInt(digits, 10) - k;
    if (code > 0 && code < 0x110000) {
      playbackUrl += String.fromCharCode(code);
    }
  }

  if (!playbackUrl) return null;
  if (playbackUrl.includes('.m3u8') || playbackUrl.startsWith('http')) {
    return playbackUrl;
  }

  return null;
}
