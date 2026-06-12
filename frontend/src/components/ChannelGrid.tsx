import { useMemo, useState } from 'react';
import type { Channel } from '../types';
import {
  CHANNEL_GROUPS,
  countChannelsBySignal,
  filterChannelsByQuery,
  filterChannelsBySignal,
  groupChannelsByCategory,
  groupChannelsBySections,
  isChannelLiveSignal,
  type ChannelGroupId,
  type SignalFilter,
  type TabCategory,
} from '../utils/channels';
import { ChannelGuideToolbar } from './ChannelGuideToolbar';
import { ChannelSection } from './ChannelSection';

export type { TabCategory };

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
  const [search, setSearch] = useState('');
  const [signalFilter, setSignalFilter] = useState<SignalFilter>('live');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const tabCounts = useMemo(
    () => ({
      Latam: groupChannelsByCategory(channels, 'Latam').length,
      Internacional: groupChannelsByCategory(channels, 'Internacional').length,
      Canales: groupChannelsByCategory(channels, 'Canales').length,
    }),
    [channels],
  );

  const tabChannels = useMemo(
    () => groupChannelsByCategory(channels, activeTab),
    [channels, activeTab],
  );

  const signalCounts = useMemo(() => countChannelsBySignal(tabChannels), [tabChannels]);

  const baseFiltered = useMemo(() => {
    const bySignal = filterChannelsBySignal(tabChannels, signalFilter);
    return filterChannelsByQuery(bySignal, search);
  }, [tabChannels, signalFilter, search]);

  const sections = useMemo(
    () => groupChannelsBySections(baseFiltered, activeTab),
    [baseFiltered, activeTab],
  );

  const visibleGroups = CHANNEL_GROUPS.filter((g) => sections.has(g.id));

  return (
    <div className="flex flex-col gap-4">
      <ChannelGuideToolbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabCounts={tabCounts}
        search={search}
        onSearchChange={setSearch}
        signalFilter={signalFilter}
        onSignalFilterChange={setSignalFilter}
        signalCounts={signalCounts}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
      />

      <div className="max-h-[min(42vh,420px)] space-y-2 overflow-y-auto pr-1">
        {visibleGroups.map((g) => {
          const list = sections.get(g.id);
          if (!list?.length) return null;
          const hasLive = list.some(isChannelLiveSignal);
          return (
            <ChannelSection
              key={g.id}
              groupId={g.id as ChannelGroupId}
              channels={list}
              activeId={activeId}
              defaultExpanded={hasLive || visibleGroups.length <= 3}
              onSelect={onSelect}
            />
          );
        })}

        {visibleGroups.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <img src="/brand/fuchibol-mark.svg" alt="" className="mb-4 h-12 w-12 opacity-40" />
            <p className="text-sm text-white/40">
              {signalFilter === 'live'
                ? 'Ningún canal en línea en esta categoría. El auditor sigue verificando…'
                : 'No hay canales que coincidan con tu búsqueda'}
            </p>
            {signalFilter === 'live' && (
              <button
                type="button"
                onClick={() => setSignalFilter('all')}
                className="mt-3 text-xs font-medium text-electric hover:underline"
              >
                Ver todos los canales
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
