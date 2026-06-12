import type { SignalFilter, TabCategory } from '../utils/channels';

const TAB_CATEGORIES = ['Latam', 'Internacional', 'Canales'] as const;

interface ChannelGuideToolbarProps {
  activeTab: TabCategory;
  onTabChange: (tab: TabCategory) => void;
  tabCounts: Record<TabCategory, number>;
  search: string;
  onSearchChange: (value: string) => void;
  signalFilter: SignalFilter;
  onSignalFilterChange: (filter: SignalFilter) => void;
  signalCounts: Record<SignalFilter, number>;
  showAdvanced: boolean;
  onToggleAdvanced: () => void;
}

const PRIMARY_SIGNALS: SignalFilter[] = ['live', 'all', 'offline'];

const ADVANCED_SIGNALS: SignalFilter[] = ['standby', 'pending'];

const ALL_SIGNALS: SignalFilter[] = [...PRIMARY_SIGNALS, ...ADVANCED_SIGNALS];

const SIGNAL_LABELS: Record<SignalFilter, string> = {
  live: 'En línea',
  all: 'Todos',
  offline: 'Sin señal',
  standby: 'En espera',
  pending: 'Sin verificar',
};

function signalButtonClass(id: SignalFilter, active: boolean): string {
  if (!active) {
    return 'text-white/40 hover:bg-white/[0.04] hover:text-white/70';
  }
  if (id === 'live') {
    return 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30';
  }
  if (id === 'standby' || id === 'pending') {
    return 'bg-white/10 text-white ring-1 ring-white/15';
  }
  return 'bg-electric/15 text-electric ring-1 ring-electric/30';
}

function SignalChip({
  id,
  count,
  active,
  onSelect,
}: {
  id: SignalFilter;
  count: number;
  active: boolean;
  onSelect: (id: SignalFilter) => void;
}) {
  if (id !== 'all' && count === 0) return null;
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${signalButtonClass(id, active)}`}
    >
      {SIGNAL_LABELS[id]} ({count})
    </button>
  );
}

export function ChannelGuideToolbar({
  activeTab,
  onTabChange,
  tabCounts,
  search,
  onSearchChange,
  signalFilter,
  onSignalFilterChange,
  signalCounts,
  showAdvanced,
  onToggleAdvanced,
}: ChannelGuideToolbarProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TAB_CATEGORIES.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? 'bg-electric/15 text-white ring-1 ring-electric/40'
                  : 'text-white/45 hover:bg-white/[0.04] hover:text-white/75'
              }`}
            >
              {tab}
              <span className="ml-1.5 text-xs font-normal opacity-50">{tabCounts[tab]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:w-52 lg:flex-none">
            <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-white/30">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C8.01 14 6 11.99 6 9.5S8.01 5 10.5 5 15 7.01 15 9.5 12.99 14 10.5 14z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar canal..."
              className="w-full rounded-lg bg-white/[0.05] py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/30 ring-1 ring-white/[0.06] focus:outline-none focus:ring-electric/40"
            />
          </div>
          <button
            type="button"
            onClick={onToggleAdvanced}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition lg:hidden ${
              showAdvanced
                ? 'bg-white/10 text-white ring-white/15'
                : 'text-white/40 ring-white/[0.06] hover:text-white/70'
            }`}
            aria-expanded={showAdvanced}
            aria-label="Abrir filtros de señal"
          >
            Filtros
          </button>
          <button
            type="button"
            onClick={onToggleAdvanced}
            className={`hidden shrink-0 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition lg:inline-flex ${
              showAdvanced
                ? 'bg-white/10 text-white ring-white/15'
                : 'text-white/40 ring-white/[0.06] hover:text-white/70'
            }`}
            aria-expanded={showAdvanced}
          >
            Más filtros
            <span className="ml-1 opacity-50">{showAdvanced ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRIMARY_SIGNALS.map((id) => (
          <SignalChip
            key={id}
            id={id}
            count={signalCounts[id]}
            active={signalFilter === id}
            onSelect={onSignalFilterChange}
          />
        ))}
        {showAdvanced &&
          ADVANCED_SIGNALS.map((id) => (
            <span key={id} className="hidden lg:contents">
              <SignalChip
                id={id}
                count={signalCounts[id]}
                active={signalFilter === id}
                onSelect={onSignalFilterChange}
              />
            </span>
          ))}
      </div>

      {showAdvanced && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            aria-label="Cerrar filtros"
            onClick={onToggleAdvanced}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filtros de señal"
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#0d1530] p-4 pb-6 ring-1 ring-white/10 lg:hidden animate-[sheet-up_0.25s_ease-out]"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
            <p className="mb-3 text-sm font-semibold text-white">Filtrar por señal</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SIGNALS.map((id) => (
                <SignalChip
                  key={id}
                  id={id}
                  count={signalCounts[id]}
                  active={signalFilter === id}
                  onSelect={onSignalFilterChange}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={onToggleAdvanced}
              className="mt-5 w-full rounded-lg bg-electric/20 py-2.5 text-sm font-semibold text-electric ring-1 ring-electric/30"
            >
              Listo
            </button>
          </div>
        </>
      )}
    </div>
  );
}
