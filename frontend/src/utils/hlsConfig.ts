import type Hls from 'hls.js';

/** Config orientada a máxima calidad visual (no ultra-low-latency). */
export function createHlsInstance(HlsClass: typeof Hls): Hls {
  return new HlsClass({
    enableWorker: true,
    lowLatencyMode: false,
    capLevelToPlayerSize: false,
    capLevelOnFPSDrop: false,
    startLevel: -1,
    abrEwmaDefaultEstimate: 50_000_000,
    abrBandWidthFactor: 0.95,
    abrBandWidthUpFactor: 0.85,
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    backBufferLength: 90,
    maxBufferSize: 80 * 1000 * 1000,
    maxBufferHole: 0.5,
    nudgeMaxRetry: 6,
  });
}

export function applyHighestLevel(hls: Hls): void {
  if (hls.levels.length <= 1) return;

  let best = 0;
  for (let i = 1; i < hls.levels.length; i++) {
    const cur = hls.levels[i];
    const top = hls.levels[best];
    const curH = cur.height ?? 0;
    const topH = top.height ?? 0;
    if (curH > topH || (curH === topH && cur.bitrate > top.bitrate)) best = i;
  }

  hls.currentLevel = best;
  hls.autoLevelCapping = -1;
}

export function formatQualityLabel(hls: Hls): string | null {
  const level = hls.levels[hls.currentLevel];
  if (!level) return null;
  if (level.height) return `${level.height}p`;
  if (level.bitrate) return `${Math.round(level.bitrate / 1000)}k`;
  return 'HD';
}
