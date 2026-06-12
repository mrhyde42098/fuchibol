import type { Channel } from '../types';
import { isChannelLiveSignal, signalLabel } from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';
import { HorizontalScroll } from './HorizontalScroll';

interface LiveNowStripProps {
  channels: Channel[];
  activeId: string | null;
  totalLive?: number;
  onSelect: (channel: Channel) => void;
}

export function LiveNowStrip({ channels, activeId, totalLive, onSelect }: LiveNowStripProps) {
  const liveCount = totalLive ?? channels.length;

  return (
    <section className="mb-4 rounded-2xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h2 className="font-display text-sm font-semibold text-white">En el aire</h2>
          <span className="rounded-md bg-emerald-500/12 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            {liveCount} en línea
          </span>
        </div>
        <p className="hidden text-[10px] text-white/30 sm:block">Desliza para ver más →</p>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center py-6">
          <img src="/brand/fuchibol-mark.svg" alt="" className="mb-3 h-10 w-10 opacity-30" />
          <p className="text-center text-xs text-white/35">
            Verificando canales con señal activa…
          </p>
        </div>
      ) : (
        <HorizontalScroll ariaLabel="Canales en el aire" className="mx-[-4px]">
          {channels.map((ch) => {
            const active = ch.id === activeId;
            const live = isChannelLiveSignal(ch);

            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => onSelect(ch)}
                className={`flex w-[132px] shrink-0 flex-col items-center gap-2.5 rounded-xl p-3 transition ${
                  active
                    ? 'bg-electric/12 ring-1 ring-electric/45'
                    : 'bg-white/[0.02] ring-1 ring-white/[0.05] hover:bg-white/[0.05]'
                }`}
              >
                <ChannelLogo name={ch.name} logo={ch.logo} channelId={ch.id} size="xl" active={active} />
                <div className="w-full text-center">
                  <p className={`truncate text-[11px] font-semibold leading-tight ${active ? 'text-white' : 'text-white/85'}`}>
                    {ch.name}
                  </p>
                  <p className="mt-1 text-[10px]">
                    <span className={live ? 'text-emerald-400' : 'text-amber-400'}>
                      {signalLabel(ch)}
                    </span>
                    {ch.audit?.isHd && live && (
                      <span className="ml-1 font-semibold text-electric">HD</span>
                    )}
                  </p>
                </div>
              </button>
            );
          })}
        </HorizontalScroll>
      )}
    </section>
  );
}
