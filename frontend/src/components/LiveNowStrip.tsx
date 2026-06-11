import type { Channel } from '../types';
import { isChannelOnline } from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';
import { HorizontalScroll } from './HorizontalScroll';

interface LiveNowStripProps {
  channels: Channel[];
  activeId: string | null;
  onSelect: (channel: Channel) => void;
}

export function LiveNowStrip({ channels, activeId, onSelect }: LiveNowStripProps) {
  if (channels.length === 0) return null;

  return (
    <section className="mb-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent p-4 ring-1 ring-white/[0.06]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-white">
            En el aire
          </h2>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            {channels.length} señales
          </span>
        </div>
        <p className="hidden text-[10px] text-white/30 sm:block">Desliza o usa las flechas →</p>
      </div>

      <HorizontalScroll ariaLabel="Canales en el aire" className="mx-[-4px]">
        {channels.map((ch) => {
          const active = ch.id === activeId;
          const online = isChannelOnline(ch);

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelect(ch)}
              className={`flex w-[148px] shrink-0 flex-col items-center gap-2 rounded-xl p-3 transition-all duration-200 ${
                active
                  ? 'bg-electric/15 shadow-[0_0_28px_rgba(0,102,255,0.3)] ring-1 ring-electric/50'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] ring-1 ring-white/[0.04]'
              }`}
            >
              <ChannelLogo name={ch.name} logo={ch.logo} channelId={ch.id} size="lg" active={active} />
              <div className="w-full text-center">
                <p className={`truncate text-xs font-semibold ${active ? 'text-white' : 'text-white/85'}`}>
                  {ch.name}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1.5 text-[10px]">
                  {online ? (
                    <span className="text-emerald-400">● ON</span>
                  ) : (
                    <span className="text-amber-400/80">◐ Débil</span>
                  )}
                  {ch.audit?.isHd && <span className="font-bold text-electric">HD</span>}
                </p>
              </div>
            </button>
          );
        })}
      </HorizontalScroll>
    </section>
  );
}
