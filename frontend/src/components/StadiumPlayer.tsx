import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { LoadingSpinner } from './LoadingSpinner';
import { OffsideBanner } from './OffsideBanner';
import { applyHighestLevel, createHlsInstance, formatQualityLabel } from '../utils/hlsConfig';

interface StadiumPlayerProps {
  src: string | null;
  channelId: string | null;
  channelName: string;
  onStreamFailed?: () => void;
}

function isFullscreenActive(): boolean {
  return Boolean(
    document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement,
  );
}

export function StadiumPlayer({ src, channelId, channelName, onStreamFailed }: StadiumPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(false);
  const [offside, setOffside] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [qualityLabel, setQualityLabel] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const retryCountRef = useRef(0);
  const mediaRetryRef = useRef(0);
  const onStreamFailedRef = useRef(onStreamFailed);
  const loadGenerationRef = useRef(0);
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevChannelIdRef = useRef<string | null>(null);
  /** Tras el primer gesto del usuario, mantener sonido en recargas y refrescos de token */
  const userWantsSoundRef = useRef(false);
  const volumeRef = useRef(0.7);

  const applyAudioPrefs = useCallback((video: HTMLVideoElement) => {
    video.volume = volumeRef.current;
    if (userWantsSoundRef.current) {
      video.muted = false;
      setMuted(false);
    } else {
      video.muted = true;
      setMuted(true);
    }
  }, []);

  const rememberAudioPrefs = useCallback((video: HTMLVideoElement) => {
    volumeRef.current = video.volume;
    userWantsSoundRef.current = !video.muted && video.volume > 0;
    setVolume(video.volume);
    setMuted(video.muted);
  }, []);

  useEffect(() => {
    onStreamFailedRef.current = onStreamFailed;
  }, [onStreamFailed]);

  const clearRetryTimeout = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  const updateQuality = useCallback((hls: Hls) => {
    setQualityLabel(formatQualityLabel(hls));
  }, []);

  const destroyHls = useCallback(() => {
    clearRetryTimeout();
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.removeAttribute('src');
      video.load();
    }
  }, [clearRetryTimeout]);

  const showControlsBriefly = useCallback(() => {
    setControlsVisible(true);
    if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
    controlsHideTimerRef.current = setTimeout(() => {
      if (!isFullscreenActive()) setControlsVisible(false);
    }, 4500);
  }, []);

  const loadStream = useCallback(
    (url: string) => {
      const video = videoRef.current;
      if (!video) return;

      const generation = ++loadGenerationRef.current;
      destroyHls();
      setLoading(true);
      setOffside(false);
      setUnsupported(false);
      setQualityLabel(null);
      retryCountRef.current = 0;
      mediaRetryRef.current = 0;

      applyAudioPrefs(video);

      if (Hls.isSupported()) {
        const hls = createHlsInstance(Hls);
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (generation !== loadGenerationRef.current) return;
          applyHighestLevel(hls);
          updateQuality(hls);
          setLoading(false);
          video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          showControlsBriefly();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, () => updateQuality(hls));

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCountRef.current < 4) {
            retryCountRef.current += 1;
            setOffside(true);
            clearRetryTimeout();
            retryTimeoutRef.current = setTimeout(() => {
              if (generation !== loadGenerationRef.current) return;
              hls.startLoad();
              setOffside(false);
            }, 1500 * retryCountRef.current);
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetryRef.current < 3) {
            mediaRetryRef.current += 1;
            hls.recoverMediaError();
            return;
          }

          if (generation !== loadGenerationRef.current) return;
          setLoading(false);
          setOffside(true);
          onStreamFailedRef.current?.();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener(
          'loadedmetadata',
          () => {
            if (generation !== loadGenerationRef.current) return;
            setLoading(false);
            setQualityLabel('Auto');
            video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
            showControlsBriefly();
          },
          { once: true },
        );
        video.addEventListener(
          'error',
          () => {
            if (generation !== loadGenerationRef.current) return;
            setLoading(false);
            setOffside(true);
            onStreamFailedRef.current?.();
          },
          { once: true },
        );
      } else {
        setLoading(false);
        setUnsupported(true);
      }
    },
    [applyAudioPrefs, clearRetryTimeout, destroyHls, showControlsBriefly, updateQuality],
  );

  const softRefreshStream = useCallback(
    (url: string) => {
      const hls = hlsRef.current;
      const video = videoRef.current;
      if (!hls || !video) return false;

      hls.loadSource(url);
      hls.startLoad();
      applyAudioPrefs(video);
      void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      return true;
    },
    [applyAudioPrefs],
  );

  useEffect(() => {
    if (!src) {
      destroyHls();
      prevChannelIdRef.current = null;
      setLoading(false);
      setOffside(false);
      setUnsupported(false);
      setQualityLabel(null);
      return;
    }

    const channelChanged = channelId !== prevChannelIdRef.current;

    if (!channelChanged && hlsRef.current && softRefreshStream(src)) {
      return;
    }

    if (channelChanged) {
      destroyHls();
    }

    prevChannelIdRef.current = channelId;
    loadStream(src);
  }, [src, channelId, loadStream, destroyHls, softRefreshStream]);

  useEffect(() => () => destroyHls(), [destroyHls]);

  useEffect(() => {
    const onFs = () => setIsFullscreen(isFullscreenActive());
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    rememberAudioPrefs(video);
  };

  const handleVolume = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    if (v > 0 && video.muted) {
      video.muted = false;
    }
    rememberAudioPrefs(video);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (isFullscreenActive()) {
      const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> };
      if (doc.webkitExitFullscreen) void doc.webkitExitFullscreen();
      else void document.exitFullscreen();
    } else {
      const htmlEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
      if (htmlEl.webkitRequestFullscreen) void htmlEl.webkitRequestFullscreen();
      else void el.requestFullscreen();
    }
  };

  const forceHd = () => {
    const hls = hlsRef.current;
    if (!hls) return;
    applyHighestLevel(hls);
    updateQuality(hls);
  };

  const handleRetry = () => {
    if (src) loadStream(src);
  };

  const controlsShown = controlsVisible || isFullscreen || muted;

  return (
    <div
      ref={containerRef}
      className={`stadium-screen group relative w-full overflow-hidden rounded-2xl bg-[#03060f] shadow-[0_0_100px_rgba(0,0,0,0.75),inset_0_0_140px_rgba(0,102,255,0.05)] ring-1 ring-white/8 ${
        isFullscreen ? 'h-screen max-h-screen rounded-none' : 'aspect-video min-h-[min(50vh,720px)] max-h-[78vh] w-full'
      }`}
      onMouseEnter={() => setControlsVisible(true)}
      onMouseLeave={() => {
        if (!isFullscreen) setControlsVisible(false);
      }}
      onClick={() => showControlsBriefly()}
    >
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.55)_100%)]" />

      <video
        ref={videoRef}
        className="stadium-video relative z-0 h-full w-full object-contain"
        playsInline
        autoPlay
        aria-label={`Reproductor: ${channelName}`}
      />

      {qualityLabel && !loading && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={forceHd}
            className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-electric backdrop-blur-md ring-1 ring-electric/30 transition hover:bg-electric/20"
            title="Forzar máxima calidad"
          >
            {qualityLabel}
          </button>
        </div>
      )}

      {muted && !loading && !unsupported && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const video = videoRef.current;
            if (video) {
              video.muted = false;
              rememberAudioPrefs(video);
            }
          }}
          className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-black/60 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md ring-1 ring-white/20"
        >
          Toca para activar sonido
        </button>
      )}

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stadium/60">
          <LoadingSpinner label="Cargando señal HD..." />
        </div>
      )}

      {unsupported && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-stadium/80 px-6 text-center">
          <p className="text-sm text-white/80">Tu navegador no soporta reproducción HLS.</p>
          <p className="text-xs text-white/50">Prueba Chrome, Edge o Safari.</p>
        </div>
      )}

      {offside && !loading && !unsupported && <OffsideBanner onRetry={handleRetry} />}

      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-5 pb-4 pt-20 transition-opacity duration-300 ${
          controlsShown ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="mb-3 truncate text-sm font-medium text-white/85">{channelName}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-electric"
            aria-label={playing ? 'Pausar' : 'Reproducir'}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-electric"
            aria-label={muted ? 'Activar sonido' : 'Silenciar'}
          >
            {muted || volume === 0 ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
              </svg>
            )}
          </button>

          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => handleVolume(Number(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/20 accent-electric"
            aria-label="Volumen"
          />

          <div className="flex-1" />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-electric"
            aria-label="Pantalla completa"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
