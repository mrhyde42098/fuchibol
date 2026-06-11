import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAgenda, getChannels, getStreamUrl } from './api/client';
import { AgendaPanel } from './components/AgendaPanel';
import { ChannelGrid, type TabCategory } from './components/ChannelGrid';
import { LiveNowStrip } from './components/LiveNowStrip';
import { StadiumPlayer } from './components/StadiumPlayer';
import { ChannelLogo } from './components/ChannelLogo';
import type { AgendaEvent, Channel } from './types';
import { getFeaturedChannels } from './utils/channels';

type BottomTab = 'canales' | 'agenda';

export default function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [agenda, setAgenda] = useState<AgendaEvent[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [categoryTab, setCategoryTab] = useState<TabCategory>('Latam');
  const [bottomTab, setBottomTab] = useState<BottomTab>('canales');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const featured = useMemo(() => getFeaturedChannels(channels, agenda), [channels, agenda]);
  const initialChannelPicked = useRef(false);
  const playRequestRef = useRef(0);

  const playChannel = useCallback(async (channel: Channel) => {
    if (channel.audit?.status === 'unavailable') return;

    const requestId = ++playRequestRef.current;
    setActiveChannel(channel);
    setStreamUrl(null);

    try {
      const { proxyUrl } = await getStreamUrl(channel.id);
      if (requestId !== playRequestRef.current) return;
      setStreamUrl(proxyUrl);
    } catch {
      if (requestId !== playRequestRef.current) return;
      setStreamUrl(null);
    }
  }, []);

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
    loadData()
      .then(({ ch, ag }) => {
        if (initialChannelPicked.current) return;

        const first =
          getFeaturedChannels(ch, ag).find((c) => c.audit?.status !== 'unavailable') ??
          ch.find((c) => c.audit?.status !== 'unavailable') ??
          ch[0];

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
      .catch((err) => setError(err instanceof Error ? err.message : 'Error de conexión'))
      .finally(() => setLoading(false));
  }, [loadData, playChannel]);

  useEffect(() => {
    const refresh = setInterval(() => {
      void loadData().catch(() => {});
    }, 120_000);
    return () => clearInterval(refresh);
  }, [loadData]);

  const handleAgendaSelect = (channelId: string, label: string) => {
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
      void getStreamUrl(channelId).then(({ proxyUrl }) => {
        setActiveChannel({ id: channelId, name: label, category: '', logo: '' });
        setStreamUrl(proxyUrl);
        setBottomTab('canales');
      });
    }
  };

  const tryNextChannel = useCallback(() => {
    if (!activeChannel) return;
    const pool = featured.length > 0 ? featured : channels;
    const idx = pool.findIndex((c) => c.id === activeChannel.id);
    const next = pool.slice(idx + 1).find((c) => c.audit?.status !== 'unavailable');
    if (next) void playChannel(next);
  }, [activeChannel, channels, featured, playChannel]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-stadium">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-electric border-t-transparent" />
          <p className="font-display text-sm tracking-wide text-white/50">Entrando al estadio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-stadium px-4">
        <p className="text-red-400">{error}</p>
        <p className="text-sm text-white/40">Verifica que el backend esté corriendo</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col bg-stadium">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_0%,rgba(0,102,255,0.14),transparent_55%)]" />

      <header className="relative z-10 flex shrink-0 items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-blue-700 font-display text-base font-bold shadow-[0_4px_20px_rgba(0,102,255,0.4)]">
            F
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-white">Fuchibol</h1>
            <p className="text-[9px] font-medium uppercase tracking-[0.25em] text-white/35">Live Sports</p>
          </div>
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
            channelName={activeChannel?.name ?? 'Selecciona un canal'}
            onStreamFailed={tryNextChannel}
          />
        </div>

        <div className="mx-auto mt-3 w-full max-w-[1920px] shrink-0">
          <LiveNowStrip
            channels={featured}
            activeId={activeChannel?.id ?? null}
            onSelect={(ch) => void playChannel(ch)}
          />

          <div className="overflow-hidden rounded-2xl bg-black/30 shadow-[0_-8px_40px_rgba(0,0,0,0.4)] ring-1 ring-white/[0.07] backdrop-blur-xl">
            <div className="flex items-center border-b border-white/[0.06] px-2 sm:px-4">
              <button
                type="button"
                onClick={() => setBottomTab('canales')}
                className={`relative px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                  bottomTab === 'canales' ? 'text-white' : 'text-white/35 hover:text-white/60'
                }`}
              >
                Guía de canales
                {bottomTab === 'canales' && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-electric" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setBottomTab('agenda')}
                className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition ${
                  bottomTab === 'agenda' ? 'text-white' : 'text-white/35 hover:text-white/60'
                }`}
              >
                Agenda deportiva
                {agenda.length > 0 && (
                  <span className="rounded-full bg-electric/20 px-1.5 py-0.5 text-[10px] text-electric">
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
