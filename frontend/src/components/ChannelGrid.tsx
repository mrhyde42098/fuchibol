import { useMemo, useState } from 'react';
import type { Channel } from '../types';
import {
  CHANNEL_GROUPS,
  filterChannelsByQuery,
  groupChannelsByCategory,
  groupChannelsBySections,
  type ChannelGroupId,
  type TabCategory,
} from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';

const TAB_CATEGORIES = ['Latam', 'Internacional', 'Canales'] as const;
export type { TabCategory };

interface ChannelGridProps {
  channels: Channel[];
  activeId: string | null;
  activeTab: TabCategory;
  onTabChange: (tab: TabCategory) => void;
  onSelect: (channel: Channel) => void;
}

function ChannelRow({
  ch,
  isActive,
  onSelect,
}: {
  ch: Channel;
  isActive: boolean;
  onSelect: () => void;
}) {
  const unavailable = ch.audit?.status === 'unavailable';
  const degraded = ch.audit?.status === 'degraded';

  return (
    <button
      type="button"
      disabled={unavailable}
      onClick={onSelect}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all ${
        isActive
          ? 'bg-electric/12 ring-1 ring-electric/40'
          : unavailable
            ? 'cursor-not-allowed opacity-30'
            : 'hover:bg-white/[0.05]'
      }`}
    >
      <ChannelLogo name={ch.name} logo={ch.logo} channelId={ch.id} size="md" active={isActive} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/90">{ch.name}</p>
        <div className="mt-0.5 flex gap-2 text-[10px]">
          {unavailable ? (
            <span className="text-red-400">Fuera</span>
          ) : degraded ? (
            <span className="text-amber-400">Débil</span>
          ) : (
            <span className="text-emerald-400">ON</span>
          )}
          {ch.audit?.isHd && <span className="text-electric">HD</span>}
        </div>
      </div>
    </button>
  );
}

export function ChannelGrid({
  channels,
  activeId,
  activeTab,
  onTabChange,
  onSelect,
}: ChannelGridProps) {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | null>(null);

  const baseFiltered = useMemo(
    () => filterChannelsByQuery(groupChannelsByCategory(channels, activeTab), search),
    [channels, activeTab, search],
  );

  const sections = useMemo(() => {
    const map = groupChannelsBySections(baseFiltered, activeTab);
    if (!groupFilter) return map;

    const single = map.get(groupFilter as ChannelGroupId);
    const filtered = new Map<ChannelGroupId, Channel[]>();
    if (single?.length) filtered.set(groupFilter as ChannelGroupId, single);
    return filtered;
  }, [baseFiltered, activeTab, groupFilter]);

  const visibleGroups = CHANNEL_GROUPS.filter((g) => sections.has(g.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TAB_CATEGORIES.map((tab) => {
            const count = groupChannelsByCategory(channels, tab).length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  onTabChange(tab);
                  setGroupFilter(null);
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition ${
                  activeTab === tab
                    ? 'bg-electric text-white shadow-[0_4px_20px_rgba(0,102,255,0.35)]'
                    : 'bg-white/[0.04] text-white/45 hover:text-white/70'
                }`}
              >
                {tab} <span className="opacity-50">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="relative">
          <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-white/30">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar canal..."
            className="w-full rounded-full bg-white/[0.05] py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/30 ring-1 ring-white/[0.06] focus:outline-none focus:ring-electric/50 sm:w-56"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setGroupFilter(null)}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
            !groupFilter ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
          }`}
        >
          Todos
        </button>
        {CHANNEL_GROUPS.map((g) => {
          const count = groupChannelsBySections(
            groupChannelsByCategory(channels, activeTab),
            activeTab,
          ).get(g.id)?.length;
          if (!count) return null;
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroupFilter(groupFilter === g.id ? null : g.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                groupFilter === g.id
                  ? 'bg-electric/20 text-electric'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              {g.icon} {g.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="max-h-[min(42vh,420px)] space-y-5 overflow-y-auto pr-1">
        {visibleGroups.map((g) => {
          const list = sections.get(g.id);
          if (!list?.length) return null;

          return (
            <div key={g.id}>
              <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.15em] text-white/40">
                <span>{g.icon}</span> {g.label}
                <span className="h-px flex-1 bg-white/[0.06]" />
              </h3>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((ch) => (
                  <ChannelRow
                    key={ch.id}
                    ch={ch}
                    isActive={ch.id === activeId}
                    onSelect={() => onSelect(ch)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        {visibleGroups.length === 0 && (
          <p className="py-10 text-center text-sm text-white/35">No hay canales que coincidan</p>
        )}
      </div>
    </div>
  );
}
