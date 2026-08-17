import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export function EventGuruInsight({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <aside className="rounded-[28px] border border-blue-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <img src="/setu-guru/guru-avatar-128.png" alt="Setu Guru" className="h-12 w-12 rounded-full bg-blue-50 p-1" />
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700"><Sparkles className="h-3.5 w-3.5" />Setu Guru · Current event</p>
          <h3 className="mt-1 font-black text-slate-950">{title}</h3>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{body}</p>
      <Link href={href} className="mt-3 inline-flex min-h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white">{action}</Link>
    </aside>
  );
}
