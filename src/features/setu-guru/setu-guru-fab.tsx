'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

type SetuGuruFabProps = {
  label: string;
  online?: boolean;
  onClick: () => void;
  className?: string;
};

type Point = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function SetuGuruFab({ label, online = true, onClick, className }: SetuGuruFabProps) {
  const [position, setPosition] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const pointerRef = useRef<{ id: number; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('setu-guru-fab-position');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as Point;
        if (Number.isFinite(parsed.x) && Number.isFinite(parsed.y)) {
          setPosition({ x: clamp(parsed.x, 8, window.innerWidth - 88), y: clamp(parsed.y, 8, window.innerHeight - 88) });
          return;
        }
      } catch {}
    }
    // Default to bottom-left: the quick-capture "+" FAB already occupies bottom-right
    // (mobile-shell.tsx), and the header now also carries a docked Guru launcher, so
    // this floating bubble is a secondary entry point, not the only one.
    setPosition({ x: 16, y: Math.max(16, window.innerHeight - 112) });
  }, []);

  useEffect(() => {
    if (!position || typeof window === 'undefined') return;
    window.localStorage.setItem('setu-guru-fab-position', JSON.stringify(position));
  }, [position]);

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!position) return;
    pointerRef.current = { id: event.pointerId, dx: event.clientX - position.x, dy: event.clientY - position.y, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const pointer = pointerRef.current;
    if (!pointer || pointer.id !== event.pointerId) return;
    const next = {
      x: clamp(event.clientX - pointer.dx, 8, window.innerWidth - 88),
      y: clamp(event.clientY - pointer.dy, 8, window.innerHeight - 88),
    };
    if (Math.abs(next.x - (position?.x ?? next.x)) > 2 || Math.abs(next.y - (position?.y ?? next.y)) > 2) pointer.moved = true;
    setPosition(next);
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const pointer = pointerRef.current;
    setDragging(false);
    if (pointer?.id === event.pointerId) {
      pointerRef.current = null;
      if (pointer.moved) return;
    }
    onClick();
  }

  const style = position ? { left: position.x, top: position.y } : { right: 24, bottom: 24 };

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        'group fixed z-[10050] flex h-16 w-16 touch-none select-none items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:scale-105 hover:ring-teal-200 sm:h-[4.5rem] sm:w-[4.5rem]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
        className,
      )}
      style={style}
      aria-label={label}
    >
      <span className="absolute inset-1 rounded-full bg-slate-950/95 shadow-inner" />
      <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={64} height={64} className="relative z-10 h-12 w-12 rounded-full object-contain sm:h-14 sm:w-14" priority />
      {online ? <span className="absolute right-1 top-1 z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 sm:h-4 sm:w-4" /> : null}
      <span className="sr-only">{label}</span>
    </button>
  );
}
