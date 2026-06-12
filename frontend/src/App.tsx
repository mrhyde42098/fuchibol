import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAgenda, getChannels, getStreamUrl, probeChannel } from './api/client';
import { AgendaPanel } from './components/AgendaPanel';
import { ChannelGrid, type TabCategory } from './components/ChannelGrid';
import { LiveNowStrip } from './components/LiveNowStrip';
import { LoadingSpinner } from './components/LoadingSpinner';
import { StadiumPlayer } from './components/StadiumPlayer';
import { ChannelLogo } from './components/ChannelLogo';
import type { AgendaEvent, Channel } from './types';
import {
  getFeaturedChannels,
  isChannelLiveSignal,
  isChannelOffline,
  isChannelPendingAudit,
  pickInitialChannel,
} from './utils/channels';

type BottomTab = 'canales' | 'agenda';

function scheduleStreamRefresh(expiresInMs: number): number {
  const margin = Math.min(120_000, Math.max(60_000, Math.floor(expiresInMs * 0.25)));
  return Date.now() + expiresInMs - margin;
}

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamRefreshAt, setStreamRefreshAt] = useState<number | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<TabCategory>('Latam');
  const [bottomTab, setBottomTab] = useState<BottomTab>('canales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const featured = useMemo(() => getFeaturedChannels(channels, agenda), [channels, agenda]);
  const liveCount = useMemo(
    () => channels.filter(isChannelLiveSignal).length,
    [channels],
  );
  const initialChannelPicked = useRef(false);
  const playRequestRef = useRef(0);

  const mergeChannelAudit = useCallback((channelId: string, audit: Channel['audit']) => {
    if (!audit) return;
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, audit } : c)));
    setActiveChannel((prev) => (prev?.id === channelId ? { ...prev, audit } : prev));
  }, []);

  const applyStream = useCallback((proxyUrl: string, expiresInMs: number) => {
    setStreamUrl(proxyUrl);
    setStreamRefreshAt(scheduleStreamRefresh(expiresInMs));
    setPlayError(null);
  }, []);

  const refreshActiveStream = useCallback(async () => {
    const channel = activeChannel;
    if (!channel) return;

    const requestId = ++playRequestRef.current;
    try {
      const stream = await getStreamUrl(channel.id);
      if (requestId !== playRequestRef.current) return;
      applyStream(stream.proxyUrl, stream.expiresInMs);
    } catch {
      /* Mantener señal actual si el refresh falla; reintentar en el próximo ciclo */
      setStreamRefreshAt(Date.now() + 90_000);
    }
  }, [activeChannel, applyStream]);

  const playChannel = useCallback(async (channel: Channel) => {
    if (isChannelOffline(channel)) return;

    const requestId = ++playRequestRef.current;
    setActiveChannel(channel);
    setStreamUrl(null);
    setStreamRefreshAt(null);
    setPlayError(null);

    const auditAge = channel.audit?.lastChecked
      ? Date.now() - new Date(channel.audit.lastChecked).getTime()
      : Number.POSITIVE_INFINITY;
    const shouldProbe =
      isChannelPendingAudit(channel) || auditAge > 90_000;

    try {
      const [stream, probe] = await Promise.all([
        getStreamUrl(channel.id),
        shouldProbe ? probeChannel(channel.id).catch(() => null) : Promise.resolve(null),
      ]);

      if (requestId !== playRequestRef.current) return;

      if (probe?.audit) {
        mergeChannelAudit(channel.id, probe.audit);
        if (probe.audit.signal === 'offline' && probe.audit.status === 'unavailable') {
          setStreamUrl(null);
          setPlayError('Este canal no tiene señal en este momento.');
          return;
        }
      }

      applyStream(stream.proxyUrl, stream.expiresInMs);
    } catch (err) {
      if (requestId !== playRequestRef.current) return;
      setStreamUrl(null);
      setPlayError(
        err instanceof Error ? err.message : 'No se pudo cargar la señal del canal.',
      );
    }
  }, [applyStream, mergeChannelAudit]);

  const loadData = useCallback(() => {
    return Promise.all([getChannels(), getAgenda()])
      .then(([ch, ag]) => {
        setChannels(ch);
        setAgenda(ag);
        setActiveChannel((prev) => {
          if (!prev) return prev;
          const updated = ch.find((c) => c.id === prev.id);
          return updated ?? prev;
        });
        return { ch, ag };
      });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootTimeout = setTimeout(() => {
      if (cancelled) return;
      setLoading(false);
      setError(
        'El servidor tarda demasiado. ¿Está el backend encendido? Prueba http://localhost:4000',
      );
    }, 25_000);

    loadData()
      .then(({ ch, ag }) => {
        if (cancelled) return;
        clearTimeout(bootTimeout);

        if (initialChannelPicked.current) return;

        const first = pickInitialChannel(ch, ag);

        if (first) {
          initialChannelPicked.current = true;
          setCategoryTab(
            first.category === 'Internacional'
              ? 'Internacional'
              : first.category === 'Latam'
                ? 'Latam'
                : 'Canales',
          );
          void playChannel(first);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        clearTimeout(bootTimeout);
        setError(err instanceof Error ? err.message : 'Error de conexión');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(bootTimeout);
    };
  }, [loadData, playChannel]);

  useEffect(() => {
    const refresh = setInterval(() => {
      void loadData().catch(() => {});
    }, 60_000);
    return () => clearInterval(refresh);
  }, [loadData]);

  useEffect(() => {
    if (!activeChannel || !streamRefreshAt) return;

    const delay = streamRefreshAt - Date.now();
    if (delay <= 0) {
      void refreshActiveStream();
      return;
    }

    const timer = setTimeout(() => void refreshActiveStream(), delay);
    return () => clearTimeout(timer);
  }, [activeChannel, streamRefreshAt, refreshActiveStream]);

  const handleAgendaSelect = useCallback(
    (channelId: string, label: string) => {
      const ch = channels.find((c) => c.id === channelId);
      if (ch) {
        const tab: TabCategory =
          ch.category === 'Internacional'
            ? 'Internacional'
            : ch.category === 'Latam'
              ? 'Latam'
              : 'Canales';
        setCategoryTab(tab);
        setBottomTab('canales');
        void playChannel(ch);
      } else {
        const requestId = ++playRequestRef.current;
        setBottomTab('canales');
        void getStreamUrl(channelId)
          .then((stream) => {
            if (requestId !== playRequestRef.current) return;
            setActiveChannel({ id: channelId, name: label, category: '', logo: '' });
            applyStream(stream.proxyUrl, stream.expiresInMs);
          })
          .catch((err) => {
            if (requestId !== playRequestRef.current) return;
            setPlayError(err instanceof Error ? err.message : 'No se pudo abrir el canal.');
          });
      }
    },
    [channels, playChannel, applyStream],
  );

  const tryNextChannel = useCallback(() => {
    if (!activeChannel) return;
    const pool = featured.length > 0 ? featured : channels;
    const idx = pool.findIndex((c) => c.id === activeChannel.id);
    const next = pool.slice(idx + 1).find((c) => isChannelLiveSignal(c));
    if (next) void playChannel(next);
  }, [activeChannel, channels, featured, playChannel]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-stadium">
        <LoadingSpinner label="Entrando al estadio..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-stadium px-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-white/40">
          El backend debe estar en el puerto 4000, o abre{' '}
          <a href="http://localhost:4000" className="text-electric underline">
            http://localhost:4000
          </a>{' '}
          (modo servidor único).
        </p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setError(null);
            void loadData()
              .then(() => setLoading(false))
              .catch((err) => {
                setError(err instanceof Error ? err.message : 'Error de conexión');
                setLoading(false);
              });
          }}
          className="rounded-full bg-electric px-5 py-2 text-sm font-semibold text-white"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-stadium">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(0,102,255,0.14),transparent_55%)]" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <img
            src="/brand/fuchibol-logo.svg"
            alt="Fuchibol"
            className="h-8 w-auto sm:h-9"
            width={160}
            height={36}
          />
          <p className="hidden text-[11px] text-white/40 sm:block">En vivo · LATAM</p>
        </div>
        {activeChannel && (
          <div className="flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pl-1 pr-3 ring-1 ring-white/[0.06]">
            <ChannelLogo name={activeChannel.name} logo={activeChannel.logo} channelId={activeChannel.id} size="sm" active />
            <span className="hidden max-w-[140px] truncate text-xs font-medium text-white sm:inline">
              {activeChannel.name}
            </span>
          </div>
        )}
      </header>

      <main className="relative z-10 flex flex-1 flex-col px-2 pb-4 sm:px-4">
        <div className="mx-auto w-full max-w-[1920px] flex-1">
          <StadiumPlayer
            src={streamUrl}
            channelId={activeChannel?.id ?? null}
            channelName={activeChannel?.name ?? 'Selecciona un canal'}
            onStreamFailed={tryNextChannel}
          />
          {playError && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-red-500/10 px-4 py-2 ring-1 ring-red-500/20">
              <p className="text-sm text-red-300">{playError}</p>
              {activeChannel && (
                <button
                  type="button"
                  onClick={() => void playChannel(activeChannel)}
                  className="shrink-0 text-xs font-semibold text-red-200 underline"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mx-auto mt-3 w-full max-w-[1920px] shrink-0">
          <LiveNowStrip
            channels={featured}
            activeId={activeChannel?.id ?? null}
            totalLive={liveCount}
            onSelect={(ch) => void playChannel(ch)}
          />

          <div className="overflow-hidden rounded-2xl bg-[#060d1f]/90 shadow-[0_-4px_32px_rgba(0,0,0,0.35)] ring-1 ring-white/[0.06]">
            <div className="flex items-center border-b border-white/[0.06] px-2 sm:px-4">
              <button
                type="button"
                onClick={() => setBottomTab('canales')}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                  bottomTab === 'canales' ? 'text-white' : 'text-white/40 hover:text-white/65'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current opacity-70">
                  <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h10v2H4v-2z" />
                </svg>
                Guía de canales
                {bottomTab === 'canales' && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-electric" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('agenda')}
                className={`relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                  bottomTab === 'agenda' ? 'text-white' : 'text-white/40 hover:text-white/65'
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current opacity-70">
                  <path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10z" />
                </svg>
                Agenda
                {agenda.length > 0 && (
                  <span className="rounded-md bg-electric/15 px-1.5 py-0.5 text-[10px] font-medium text-electric">
                    {agenda.length}
                  </span>
                )}
                {bottomTab === 'agenda' && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-electric" />
                )}
              </button>
            </div>

            <div className="p-3 sm:p-4">
              {bottomTab === 'canales' ? (
                <ChannelGrid
                  channels={channels}
                  activeId={activeChannel?.id ?? null}
                  activeTab={categoryTab}
                  onTabChange={setCategoryTab}
                  onSelect={(ch) => void playChannel(ch)}
                />
              ) : (
                <AgendaPanel events={agenda} onSelectChannel={handleAgendaSelect} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
