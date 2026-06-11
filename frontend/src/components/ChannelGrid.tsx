import type { Channel } from '../types';
import { groupChannelsByCategory } from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';

const TAB_CATEGORIES = ['Latam', 'Internacional', 'Canales'] as const;
export type TabCategory = (typeof TAB_CATEGORIES)[number];

interface ChannelGridProps {
  channels: Channel[];
  activeId: string | null;
  activeTab: TabCategory;
  onTabChange: (tab: TabCategory) => void;
  onSelect: (channel: Channel) => void;
}

export function ChannelGrid({
  channels,
  activeId,
  activeTab,
  onTabChange,
  onSelect,
}: ChannelGridProps) {
  const filtered = groupChannelsByCategory(channels, activeTab);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        {TAB_CATEGORIES.map((tab) => {
          const count = groupChannelsByCategory(channels, tab).length;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-electric text-white shadow-[0_4px_20px_rgba(0,102,255,0.35)]'
                  : 'bg-white/[0.04] text-white/45 hover:bg-white/[0.08] hover:text-white/70'
              }`}
            >
              {tab}
              <span className="ml-1.5 opacity-50">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid max-h-56 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((ch) => {
          const unavailable = ch.audit?.status === 'unavailable';
          const degraded = ch.audit?.status === 'degraded';
          const isActive = ch.id === activeId;

          return (
            <button
              key={ch.id}
              type="button"
              disabled={unavailable}
              onClick={() => onSelect(ch)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                isActive
                  ? 'bg-electric/12 shadow-[inset_0_0_0_1px_rgba(0,102,255,0.4)]'
                  : unavailable
                    ? 'opacity-35 cursor-not-allowed'
                    : 'hover:bg-white/[0.05]'
              }`}
            >
              <ChannelLogo name={ch.name} logo={ch.logo} size="md" active={isActive} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">{ch.name}</p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px]">
                  {unavailable ? (
                    <span className="text-red-400/80">No disponible</span>
                  ) : degraded ? (
                    <span className="text-amber-400/80">Señal débil</span>
                  ) : (
                    <span className="text-emerald-400/80">ON</span>
                  )}
                  {ch.audit?.isHd && <span className="text-electric">HD</span>}
                  {ch.category && (
                    <span className="text-white/25">{ch.category}</span>
                  )}
                </div>
              </div>
              {!unavailable && (
                <svg
                  viewBox="0 0 24 24"
                  className={`h-4 w-4 shrink-0 transition-opacity ${
                    isActive ? 'text-electric opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-100'
                  }`}
                  fill="currentColor"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-white/35">Sin canales en esta categoría</p>
      )}
    </div>
  );
}
