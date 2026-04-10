'use client';

interface PipelineAIStripProps {
  message: string;
}

export function PipelineAIStrip({ message }: PipelineAIStripProps) {
  return (
    <section className="rounded-[1.5rem] border border-amber-100 bg-[linear-gradient(180deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))] px-4 py-3 shadow-[0_12px_30px_rgba(245,158,11,0.08)] ring-1 ring-amber-500/10 sm:px-5">
      <div className="flex items-center gap-3 text-slate-800">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-base">✦</span>
        <p className="text-sm font-semibold sm:text-[15px]">{message}</p>
      </div>
    </section>
  );
}
