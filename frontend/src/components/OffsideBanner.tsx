export function OffsideBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-stadium/90 backdrop-blur-sm">
      <div className="mx-4 max-w-md rounded-xl border border-electric/30 bg-pitch/80 px-8 py-6 text-center shadow-[0_0_40px_rgba(0,102,255,0.15)]">
        <div className="mb-3 text-3xl">🚩</div>
        <h3 className="text-lg font-semibold text-white">Señal fuera de juego</h3>
        <p className="mt-2 text-sm text-white/60">Buscando alternativa...</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 rounded-lg bg-electric px-5 py-2 text-sm font-medium text-white transition hover:bg-electric/80"
          >
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
