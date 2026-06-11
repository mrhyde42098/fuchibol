import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface HorizontalScrollProps {
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest('button, a, input, select, textarea'));
}

export function HorizontalScroll({ children, className = '', ariaLabel }: HorizontalScrollProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const dragRef = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    scrollLeft: 0,
  });

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, [updateArrows, children]);

  const scrollBy = (dir: -1 | 1) => {
    trackRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const endDrag = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !dragRef.current.active) return;

    dragRef.current.active = false;
    if (dragRef.current.pointerId >= 0) {
      el.releasePointerCapture(dragRef.current.pointerId);
    }
    dragRef.current.pointerId = -1;

    if (dragRef.current.moved) {
      e.preventDefault();
    }
    dragRef.current.moved = false;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isInteractiveTarget(e.target)) return;

    const el = trackRef.current;
    if (!el) return;

    dragRef.current = {
      active: true,
      moved: false,
      pointerId: e.pointerId,
      startX: e.clientX,
      scrollLeft: el.scrollLeft,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active || !trackRef.current) return;

    const dx = e.clientX - dragRef.current.startX;
    if (!dragRef.current.moved && Math.abs(dx) < 6) return;

    if (!dragRef.current.moved) {
      dragRef.current.moved = true;
      trackRef.current.setPointerCapture(e.pointerId);
    }

    trackRef.current.scrollLeft = dragRef.current.scrollLeft - dx;
  };

  return (
    <div className={`relative ${className}`}>
      {canLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-stadium/90 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md transition hover:bg-electric"
          aria-label="Anterior"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      )}

      <div
        ref={trackRef}
        role="list"
        aria-label={ariaLabel}
        className="horizontal-track flex gap-3 overflow-x-auto scroll-smooth px-1 py-2"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {children}
      </div>

      {canRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-stadium/90 text-white shadow-lg ring-1 ring-white/10 backdrop-blur-md transition hover:bg-electric"
          aria-label="Siguiente"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      )}

      {canLeft && (
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-stadium to-transparent" />
      )}
      {canRight && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-stadium to-transparent" />
      )}
    </div>
  );
}
