import type Hls from 'hls.js';

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 768px)').matches;
}

/** Calidad HD prioritaria con buffer estable (menos cortes). */
export function createHlsInstance(HlsClass: typeof Hls): Hls {
  const mobile = isMobileDevice();

  return new HlsClass({
    enableWorker: true,
    lowLatencyMode: false,
    capLevelToPlayerSize: false,
    capLevelOnFPSDrop: false,
    startLevel: -1,
    abrEwmaDefaultEstimate: mobile ? 8_000_000 : 50_000_000,
    abrBandWidthFactor: 0.92,
    abrBandWidthUpFactor: 0.8,
    maxBufferLength: mobile ? 40 : 55,
    maxMaxBufferLength: mobile ? 70 : 100,
    backBufferLength: mobile ? 45 : 75,
    maxBufferSize: mobile ? 45 * 1000 * 1000 : 75 * 1000 * 1000,
    maxBufferHole: 0.5,
    nudgeMaxRetry: 8,
    fragLoadingMaxRetry: 8,
    fragLoadingRetryDelay: 1000,
    manifestLoadingMaxRetry: 6,
    manifestLoadingRetryDelay: 1000,
    levelLoadingMaxRetry: 4,
    startFragPrefetch: true,
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
