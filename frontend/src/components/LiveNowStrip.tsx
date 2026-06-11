import type { Channel } from '../types';
import { isChannelOnline } from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';

interface LiveNowStripProps {
  channels: Channel[];
  activeId: string | null;
  onSelect: (channel: Channel) => void;
}

export function LiveNowStrip({ channels, activeId, onSelect }: LiveNowStripProps) {
  if (channels.length === 0) return null;

  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
        </span>
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.15em] text-white">
          En el aire
        </h2>
        <span className="text-xs text-white/30">· señales estables</span>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {channels.map((ch) => {
          const active = ch.id === activeId;
          const online = isChannelOnline(ch);

          return (
            <button
              key={ch.id}
              type="button"
              onClick={() => onSelect(ch)}
              className={`group flex shrink-0 items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 transition-all duration-200 ${
                active
                  ? 'bg-electric/20 shadow-[0_0_24px_rgba(0,102,255,0.25)]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08]'
              }`}
            >
              <ChannelLogo name={ch.name} logo={ch.logo} size="md" active={active} />
              <div className="text-left">
                <p className={`max-w-[120px] truncate text-xs font-medium ${active ? 'text-white' : 'text-white/80'}`}>
                  {ch.name}
                </p>
                <p className="flex items-center gap-1 text-[10px] text-white/35">
                  {online && <span className="text-emerald-400">ON</span>}
                  {ch.audit?.isHd && <span className="text-electric">HD</span>}
                  {ch.audit?.latencyMs != null && online && (
                    <span>{ch.audit.latencyMs}ms</span>
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
