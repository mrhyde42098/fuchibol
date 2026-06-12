import { useMemo } from 'react';
import type { AgendaEvent } from '../types';
import { isFinishedAgendaStatus, isLiveAgendaStatus, sportColor } from '../utils/channels';
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
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
        live
          ? 'bg-red-500/15 text-red-300 ring-1 ring-red-500/25'
          : finished
            ? 'bg-white/5 text-white/25'
            : 'bg-electric/10 text-electric ring-1 ring-electric/15'
      }`}
    >
      {live && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />}
      {live ? 'En vivo' : finished ? 'Finalizado' : status}
    </span>
  );
}

function EventCard({
  ev,
  onSelectChannel,
}: {
  ev: AgendaEvent;
  onSelectChannel: (id: string, label: string) => void;
}) {
  const color = sportColor(ev.category);
  const isLive = isLiveAgendaStatus(ev.status);

  return (
    <article
      className={`relative overflow-hidden rounded-xl p-4 transition hover:ring-1 hover:ring-white/10 ${
        isLive
          ? 'bg-gradient-to-br from-red-500/[0.06] to-white/[0.02] ring-1 ring-red-500/15'
          : 'bg-white/[0.025] ring-1 ring-white/[0.05]'
      }`}
    >
      <div className="flex gap-4">
        <div
          className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg"
          style={{ background: `${color}12`, borderLeft: `3px solid ${color}` }}
        >
          <span className="font-display text-lg font-bold leading-none text-white">
            {ev.time.replace(/\s*(am|pm)/i, '')}
          </span>
          <span className="mt-0.5 text-[9px] font-medium text-white/40">
            {ev.time.match(/(am|pm)/i)?.[0] ?? ''}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: `${color}18`, color }}
            >
              {ev.category}
            </span>
            <StatusPill status={ev.status} />
          </div>

          <h3 className="mt-2 font-display text-[15px] font-semibold leading-snug text-white">
            {ev.title}
          </h3>

          {ev.homeScore != null && ev.awayScore != null && (
            <p className="mt-1 font-display text-base font-bold text-electric">
              {ev.homeScore} - {ev.awayScore}
            </p>
          )}

          {(ev.channels?.length ?? 0) > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {ev.channels!.map((opt) => (
                <button
                  key={opt.channelId}
                  type="button"
                  onClick={() => onSelectChannel(opt.channelId, opt.name)}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/[0.06] transition hover:bg-electric/15 hover:ring-electric/25"
                >
                  <ChannelLogo name={opt.name} channelId={opt.channelId} size="md" />
                  <span className="max-w-[88px] truncate text-[10px] font-medium text-white/80">
                    {opt.name}
                  </span>
                  {opt.quality && (
                    <span className="text-[9px] font-medium text-electric">
                      {opt.quality.replace('Calidad ', '')}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : ev.channelId ? (
            <button
              type="button"
              onClick={() => onSelectChannel(ev.channelId!, ev.channelName ?? ev.title)}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-electric px-4 py-2 text-xs font-semibold text-white transition hover:bg-electric/90"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
              Ver en pantalla
            </button>
          ) : (
            <p className="mt-3 text-[11px] text-white/30">Sin canal sugerido</p>
          )}
        </div>
      </div>
    </article>
  );
}

export function AgendaPanel({ events, onSelectChannel }: AgendaPanelProps) {
  const { live, upcoming } = useMemo(() => {
    const liveEv: AgendaEvent[] = [];
    const upcomingEv: AgendaEvent[] = [];
    for (const ev of events) {
      if (isFinishedAgendaStatus(ev.status)) continue;
      if (isLiveAgendaStatus(ev.status)) liveEv.push(ev);
      else upcomingEv.push(ev);
    }
    return { live: liveEv, upcoming: upcomingEv };
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center py-10">
        <img src="/brand/fuchibol-mark.svg" alt="" className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm text-white/35">Agenda no disponible por ahora</p>
      </div>
    );
  }

  const dateLabel = events[0]?.dateLabel ?? 'Hoy';

  return (
    <div className="flex max-h-[min(48vh,480px)] flex-col gap-4 overflow-y-auto pr-1">
      <p className="text-center text-xs font-medium text-white/35">{dateLabel}</p>

      {live.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Ahora en vivo
          </h3>
          <div className="space-y-3">
            {live.map((ev, i) => (
              <EventCard key={`live-${i}`} ev={ev} onSelectChannel={onSelectChannel} />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-white/50">Próximos partidos</h3>
          <div className="space-y-3">
            {upcoming.map((ev, i) => (
              <EventCard key={`up-${i}`} ev={ev} onSelectChannel={onSelectChannel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
