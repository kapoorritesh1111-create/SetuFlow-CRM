import Link from 'next/link';
import { Plus } from 'lucide-react';

export function EventModeBanner({ eventName, statusLabel, timingLabel, captureHref }: { eventName: string; statusLabel: string; timingLabel: string; captureHref: string }) {
  return (
    <section className="rounded-[28px] bg-[linear-gradient(135deg,#07172f,#0b3f7f_65%,#0f766e)] p-5 text-white shadow-[0_20px_55px_rgba(15,23,42,0.20)] lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Event Mode</p>
          <h2 className="mt-2 truncate text-xl font-black">{eventName}</h2>
        </div>
        <div className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-right text-[10px] font-black uppercase tracking-[0.08em] text-blue-50">
          <span className="block">{statusLabel}</span>
          <span className="block text-cyan-200">{timingLabel}</span>
        </div>
      </div>
      <Link href={captureHref} className="mt-4 flex min-h-16 items-center justify-center rounded-2xl bg-blue-600 text-base font-black shadow-lg">
        <Plus className="mr-2 h-5 w-5" /> Capture lead
      </Link>
    </section>
  );
}
