import { useState } from 'react';
import type { Channel } from '../types';
import type { ChannelGroupId } from '../utils/channels';
import { CHANNEL_GROUPS, isChannelLiveSignal, isChannelOffline, isChannelStandby, signalLabel } from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';

interface ChannelSectionProps {
  groupId: ChannelGroupId;
  channels: Channel[];
  activeId: string | null;
  defaultExpanded?: boolean;
  onSelect: (channel: Channel) => void;
}

function ChannelCard({
  ch,
  isActive,
  onSelect,
}: {
  ch: Channel;
  isActive: boolean;
  onSelect: () => void;
}) {
  const offline = isChannelOffline(ch);
  const standby = isChannelStandby(ch);
  const live = isChannelLiveSignal(ch);

  return (
    <button
      type="button"
      disabled={offline}
      onClick={onSelect}
      className={`flex flex-col items-center gap-2 rounded-xl p-3 text-center transition ${
        isActive
          ? 'bg-electric/12 ring-1 ring-electric/40'
          : offline
            ? 'cursor-not-allowed opacity-35'
            : 'bg-white/[0.03] ring-1 ring-white/[0.05] hover:bg-white/[0.06]'
      }`}
    >
      <ChannelLogo name={ch.name} logo={ch.logo} channelId={ch.id} size="lg" active={isActive} />
      <div className="w-full min-w-0">
        <p className="truncate text-xs font-semibold text-white/90">{ch.name}</p>
        <p
          className={`mt-1 text-[10px] ${
            live ? 'text-emerald-400' : standby ? 'text-amber-400' : offline ? 'text-red-400/70' : 'text-white/35'
          }`}
        >
          {labelWithHd(ch, live)}
        </p>
      </div>
    </button>
  );
}

function labelWithHd(ch: Channel, live: boolean): string {
  const base = signalLabel(ch);
  if (live && ch.audit?.isHd) return `${base} · HD`;
  return base;
}

export function ChannelSection({
  groupId,
  channels,
  activeId,
  defaultExpanded = false,
  onSelect,
}: ChannelSectionProps) {
  const meta = CHANNEL_GROUPS.find((g) => g.id === groupId);
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!meta || channels.length === 0) return null;

  const liveCount = channels.filter(isChannelLiveSignal).length;

  return (
    <section className="rounded-xl ring-1 ring-white/[0.05]">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
      >
        {meta.logoKey ? (
          <ChannelLogo name={meta.label} channelId={meta.logoKey} size="sm" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs text-white/40">+</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white/90">{meta.label}</p>
          <p className="text-[10px] text-white/35">
            {channels.length} canales
            {liveCount > 0 && <span className="text-emerald-400"> · {liveCount} en línea</span>}
          </p>
        </div>
        <span className="text-white/30">{expanded ? '▴' : '▾'}</span>
      </button>

      {expanded && (
        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.05] p-2 sm:grid-cols-3 xl:grid-cols-4">
          {channels.map((ch) => (
            <ChannelCard
              key={ch.id}
              ch={ch}
              isActive={ch.id === activeId}
              onSelect={() => onSelect(ch)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
