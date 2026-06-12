export function LoadingSpinner({ label = 'Cargando señal...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-electric/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-electric/80" style={{ animationDuration: '1.2s' }} />
        <img
          src="/brand/fuchibol-mark.svg"
          alt=""
          width={32}
          height={32}
          className="relative z-10"
          draggable={false}
        />
      </div>
      <p className="font-display text-sm font-medium tracking-wide text-white/60">{label}</p>
    </div>
  );
}
