import { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { LoadingSpinner } from './LoadingSpinner';
import { OffsideBanner } from './OffsideBanner';

interface StadiumPlayerProps {
  src: string | null;
  channelName: string;
  onStreamFailed?: () => void;
}

export function StadiumPlayer({ src, channelName, onStreamFailed }: StadiumPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [offside, setOffside] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const retryCountRef = useRef(0);

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const loadStream = useCallback(
    (url: string) => {
      const video = videoRef.current;
      if (!video) return;

      destroyHls();
      setLoading(true);
      setOffside(false);
      retryCountRef.current = 0;

      video.muted = true;
      setMuted(true);

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 60,
          maxBufferLength: 30,
        });
        hlsRef.current = hls;

        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return;

          if (data.type === Hls.ErrorTypes.NETWORK_ERROR && retryCountRef.current < 3) {
            retryCountRef.current += 1;
            setOffside(true);
            setTimeout(() => hls.startLoad(), 1500);
            return;
          }

          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }

          setLoading(false);
          setOffside(true);
          onStreamFailed?.();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        video.addEventListener(
          'loadedmetadata',
          () => {
            setLoading(false);
            video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
          },
          { once: true },
        );
        video.addEventListener(
          'error',
          () => {
            setLoading(false);
            setOffside(true);
            onStreamFailed?.();
          },
          { once: true },
        );
      }
    },
    [destroyHls, onStreamFailed],
  );

  useEffect(() => {
    if (!src) {
      destroyHls();
      setLoading(false);
      setOffside(false);
      return;
    }
    loadStream(src);
    return destroyHls;
  }, [src, loadStream, destroyHls]);

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
    setMuted(video.muted);
  };

  const handleVolume = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    setVolume(v);
    if (v > 0 && video.muted) {
      video.muted = false;
      setMuted(false);
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen();
    }
  };

  const handleRetry = () => {
    if (src) loadStream(src);
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-2xl bg-[#050a18] shadow-[0_0_80px_rgba(0,0,0,0.6),inset_0_0_120px_rgba(0,102,255,0.04)] ring-1 ring-white/5"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)]" />

      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        muted
        autoPlay
      />

      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-stadium/60">
          <LoadingSpinner />
        </div>
      )}

      {offside && !loading && <OffsideBanner onRetry={handleRetry} />}

      <div
        className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-5 pb-4 pt-16 transition-opacity duration-300 ${
          hovering ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="mb-3 truncate text-sm font-medium text-white/80">{channelName}</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-electric"
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
            onClick={toggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-electric"
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
            className="h-1 w-20 cursor-pointer appearance-none rounded-full bg-white/20 accent-electric"
            aria-label="Volumen"
          />

          <div className="flex-1" />

          <button
            type="button"
            onClick={toggleFullscreen}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-electric"
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
