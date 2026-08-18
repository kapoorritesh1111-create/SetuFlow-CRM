import Link from 'next/link';
import { Plus, WifiOff } from 'lucide-react';
import { OfflineAwareCaptureLink } from './offline-aware-capture-link';

export function EventModeBanner({ eventName, statusLabel, timingLabel, captureHref, offlineCaptureHref }: { eventName: string; statusLabel: string; timingLabel: string; captureHref: string; offlineCaptureHref: string }) {
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
      <OfflineAwareCaptureLink href={captureHref} offlineHref={offlineCaptureHref} className="mt-4 flex min-h-16 items-center justify-center rounded-2xl bg-blue-600 text-base font-black shadow-lg">
        <Plus className="mr-2 h-5 w-5" /> Capture lead
      </OfflineAwareCaptureLink>
      <Link href={offlineCaptureHref} className="mt-2 flex min-h-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-blue-50">
        <WifiOff className="mr-2 h-4 w-4 text-cyan-200" /> Low signal? Save offline
      </Link>
    </section>
  );
}
