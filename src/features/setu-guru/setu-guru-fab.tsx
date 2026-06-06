'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

type SetuGuruFabProps = {
  label: string;
  online?: boolean;
  onClick: () => void;
  className?: string;
};

export function SetuGuruFab({ label, online = true, onClick, className }: SetuGuruFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex h-16 w-16 items-center justify-center rounded-full border border-white/80 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:scale-105 hover:ring-teal-200 sm:h-[4.5rem] sm:w-[4.5rem]',
        className,
      )}
      aria-label={label}
    >
      <span className="absolute inset-1 rounded-full bg-slate-950/95 shadow-inner" />
      <Image src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" width={64} height={64} className="relative z-10 h-12 w-12 rounded-full object-contain sm:h-14 sm:w-14" priority />
      {online ? <span className="absolute right-1 top-1 z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 sm:h-4 sm:w-4" /> : null}
      <span className="sr-only">{label}</span>
    </button>
  );
}
