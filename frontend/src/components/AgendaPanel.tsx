import type { AgendaEvent } from '../types';
import { isLiveAgendaStatus, sportColor } from '../utils/channels';
import { ChannelLogo } from './ChannelLogo';

interface AgendaPanelProps {
  events: AgendaEvent[];
  onSelectChannel: (channelId: string, label: string) => void;
}

function StatusPill({ status }: { status: string }) {
  const live = isLiveAgendaStatus(status);
  const finished = status.toUpperCase().includes('FIN');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        live
          ? 'bg-red-500/15 text-red-400'
          : finished
            ? 'bg-white/5 text-white/30'
            : 'bg-electric/10 text-electric'
      }`}
    >
      {live && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
      )}
      {live ? 'En vivo' : finished ? 'Finalizado' : status}
    </span>
  );
}

export function AgendaPanel({ events, onSelectChannel }: AgendaPanelProps) {
  if (events.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-white/35">Agenda no disponible</p>
    );
  }

  const liveFirst = [...events].sort((a, b) => {
    const aLive = isLiveAgendaStatus(a.status) ? 1 : 0;
    const bLive = isLiveAgendaStatus(b.status) ? 1 : 0;
    return bLive - aLive;
  });

  return (
    <div className="flex max-h-72 flex-col gap-0 overflow-y-auto pr-1">
      {liveFirst.map((ev, i) => {
        const color = sportColor(ev.category);
        const isLive = isLiveAgendaStatus(ev.status);

        return (
          <div
            key={`${ev.title}-${ev.time}-${i}`}
            className="group relative flex gap-4 border-l-2 py-4 pl-5 transition-colors hover:bg-white/[0.02]"
            style={{ borderColor: isLive ? color : 'rgba(255,255,255,0.06)' }}
          >
            <div className="w-14 shrink-0 text-right">
              <p className="font-display text-lg font-bold leading-none text-white">{ev.time.replace(/(am|pm)/i, '')}</p>
              <p className="mt-0.5 text-[10px] uppercase text-white/30">
                {ev.time.match(/(am|pm)/i)?.[0] ?? ''}
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: `${color}18`, color }}
                >
                  {ev.category}
                </span>
                <StatusPill status={ev.status} />
              </div>

              <h3 className="mt-1.5 font-medium leading-snug text-white/90 group-hover:text-white">
                {ev.title}
              </h3>

              {(ev.channels?.length ?? 0) > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ev.channels!.map((opt) => (
                    <button
                      key={opt.channelId}
                      type="button"
                      onClick={() => onSelectChannel(opt.channelId, opt.name)}
                      className="flex items-center gap-2 rounded-full bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-white/70 transition hover:bg-electric/15 hover:text-white"
                    >
                      <ChannelLogo name={opt.name} size="sm" />
                      <span>{opt.name}</span>
                      {opt.quality && (
                        <span className="text-[10px] text-white/30">{opt.quality.replace('Calidad ', '')}</span>
                      )}
                    </button>
                  ))}
                </div>
              ) : ev.channelId ? (
                <button
                  type="button"
                  onClick={() => onSelectChannel(ev.channelId!, ev.channelName ?? ev.title)}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-electric/10 px-3 py-1.5 text-xs font-medium text-electric transition hover:bg-electric/20"
                >
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                  Ver transmisión
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
