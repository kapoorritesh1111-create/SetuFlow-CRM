'use client';

import { useState } from 'react';

export function ColorPickerFields({ primary, secondary, accent }: { primary: string; secondary: string; accent: string }) {
  const [primaryValue, setPrimaryValue] = useState(primary || '#0B2E4A');
  const [secondaryValue, setSecondaryValue] = useState(secondary || '#061C2E');
  const [accentValue, setAccentValue] = useState(accent || '#0C7FFF');

  return (
    <div className="md:col-span-2 rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Brand colors</p>
      <h3 className="mt-1 text-base font-black text-slate-950">Pick colors visually</h3>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-600">Click a color box instead of typing a color code. Hex values stay visible as an advanced reference.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 shadow-sm">
          Primary
          <input type="color" value={primaryValue} onChange={(e) => setPrimaryValue(e.target.value.toUpperCase())} className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
          <input name="primary_color" value={primaryValue} onChange={(e) => setPrimaryValue(e.target.value.toUpperCase())} className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-black text-slate-800" />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 shadow-sm">
          Sidebar
          <input type="color" value={secondaryValue} onChange={(e) => setSecondaryValue(e.target.value.toUpperCase())} className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
          <input name="secondary_color" value={secondaryValue} onChange={(e) => setSecondaryValue(e.target.value.toUpperCase())} className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-black text-slate-800" />
        </label>
        <label className="rounded-2xl border border-slate-200 bg-white p-3 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 shadow-sm">
          Accent
          <input type="color" value={accentValue} onChange={(e) => setAccentValue(e.target.value.toUpperCase())} className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1" />
          <input name="accent_color" value={accentValue} onChange={(e) => setAccentValue(e.target.value.toUpperCase())} className="mt-2 min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs font-black text-slate-800" />
        </label>
      </div>
      <p className="mt-3 rounded-2xl border border-white/70 bg-white p-3 text-xs font-bold leading-5 text-blue-900">Setu Guru recommendation: use primary for navigation, sidebar for depth, and accent for action buttons, WhatsApp and PDF actions.</p>
    </div>
  );
}
