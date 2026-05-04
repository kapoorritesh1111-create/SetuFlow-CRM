'use client';

import { useEffect, useState } from 'react';

const mobileFeatures = [
  { icon: '⌂', label: 'Dashboard — at-a-glance view' },
  { icon: '👤', label: 'Leads — find, view, update' },
  { icon: '📷', label: 'Capture — trade show entry' },
  { icon: '📇', label: 'My Card — share your contact' },
  { icon: '✅', label: 'Tasks — what\'s due today' },
  { icon: '📦', label: 'Order status — read-only' },
];

export function DesktopRedirect({
  title = 'Open on desktop',
  description = 'Pipeline, Quote Builder, Catalog, and Reports are designed for a full screen. They\'re available at the link below on your computer.',
}: {
  title?: string;
  description?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState('');
  const [hostname, setHostname] = useState('setuflowcrm.com');

  useEffect(() => {
    setHref(window.location.href);
    setHostname(window.location.hostname);
  }, []);

  const copyLink = async () => {
    if (!href || !navigator.clipboard) return;
    await navigator.clipboard.writeText(href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className="md:hidden flex flex-col items-center text-center px-6 py-8">
      <div className="text-5xl mb-5 opacity-50">🖥</div>
      <h2 className="text-xl font-black tracking-tight text-slate-800 mb-2">{title}</h2>
      <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto mb-5">{description}</p>

      <div className="font-mono text-[11px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-md mb-6">
        {hostname}
      </div>

      <div className="flex flex-col gap-2 w-full max-w-[280px] mb-4">
        <button
          type="button"
          onClick={copyLink}
          className="w-full py-4 rounded-[14px] bg-[linear-gradient(135deg,#0b2e4a,#1a4f7a)] text-white text-[15px] font-extrabold"
        >
          📋 {copied ? 'Copied!' : 'Copy link for desktop'}
        </button>
        <a
          href={href ? `mailto:?subject=${encodeURIComponent('Open this SETU Flow workspace on desktop')}&body=${encodeURIComponent(href)}` : 'mailto:?subject=Open%20this%20SETU%20Flow%20workspace%20on%20desktop'}
          className="w-full py-4 rounded-[14px] bg-slate-100 border border-slate-200 text-slate-700 text-[15px] font-extrabold text-center"
        >
          📧 Email link to myself
        </a>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
        These screens require a keyboard and full viewport.<br />
        Available on tablet in landscape mode (≥ 1024px).
      </p>

      <div className="w-full max-w-[320px] bg-white border border-slate-200 rounded-[18px] p-4 text-left">
        <p className="text-[11px] font-extrabold text-slate-600 uppercase tracking-[0.08em] mb-3">
          Available on mobile right now
        </p>
        <div className="flex flex-col">
          {mobileFeatures.map((item, i) => (
            <div
              key={item.label}
              className={`flex items-center gap-3 text-sm text-slate-600 py-2.5 ${i < mobileFeatures.length - 1 ? 'border-b border-slate-100' : ''}`}
            >
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
