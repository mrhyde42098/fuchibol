export function LoadingSpinner({ label = 'Cargando señal...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-electric" />
      </div>
      <p className="text-sm font-medium tracking-wide text-white/60">{label}</p>
    </div>
  );
}
