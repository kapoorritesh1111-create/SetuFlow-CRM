'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

type Intent = {
  key: string;
  label: string;
  confidence: string;
  suggestedAction: string;
  evidence?: string;
  actionLabel?: string | null;
  actionHref?: string | null;
  requiresReview?: boolean;
};

type Intelligence = {
  messageId: string;
  peerAddress: string;
  intents: Intent[];
  autonomousActions?: boolean;
  reviewRequired?: boolean;
};

export function MailIntelligenceDetail({ messageId }: { messageId: string }) {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/mail/intelligence/${encodeURIComponent(messageId)}`, { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || 'Unable to load Setu Guru intelligence.');
        if (active) setData(payload);
      })
      .catch(() => { if (active) setData(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [messageId]);

  return <section className="mt-6 rounded-2xl border border-violet-100 bg-violet-50 p-5">
    <div className="flex items-center gap-2 font-black text-violet-950"><Sparkles size={16}/>Setu Guru · Reader intelligence</div>
    <p className="mt-1 text-xs text-violet-700">Evidence-backed suggestions only. Review every action before Setu Flow changes CRM or commercial state.</p>
    {loading ? <p className="mt-4 text-sm text-violet-800">Understanding this conversation…</p> : data?.intents?.length ? <div className="mt-4 space-y-3">
      {data.intents.map(intent => <div key={intent.key} className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-slate-950">{intent.label}</strong><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black uppercase text-violet-700">{intent.confidence}</span></div>
        <p className="mt-2 text-sm text-slate-700">{intent.suggestedAction}</p>
        {intent.evidence ? <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600"><span className="font-black text-slate-700">Evidence:</span> {intent.evidence}</p> : null}
        {intent.actionHref && intent.actionLabel ? <a href={intent.actionHref} className="mt-3 inline-flex rounded-lg bg-[#0b2e4a] px-3 py-2 text-xs font-black text-white">{intent.actionLabel}</a> : null}
      </div>)}
    </div> : <p className="mt-4 text-sm text-violet-800">No high-value trade intent was detected in this message.</p>}
    <p className="mt-3 text-[10px] font-semibold text-violet-700">Autonomous CRM actions: off.</p>
  </section>;
}
