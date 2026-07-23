'use client';
import { useState } from 'react';
import { ThreeDIconOrb } from './icon-3d-orb';
import { ThemeToggle } from './theme-toggle';

export function EntitySwitch({ value, onChange }: { value: 'buyer' | 'supplier'; onChange: (value: 'buyer' | 'supplier') => void }) {
  return <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1 dark:bg-slate-800"><button onClick={() => onChange('buyer')} className={`min-h-12 rounded-2xl font-black ${value === 'buyer' ? 'bg-white text-blue-600 shadow dark:bg-slate-950 dark:text-sky-300' : 'text-slate-500'}`}>Buyer</button><button onClick={() => onChange('supplier')} className={`min-h-12 rounded-2xl font-black ${value === 'supplier' ? 'bg-white text-violet-600 shadow dark:bg-slate-950 dark:text-violet-300' : 'text-slate-500'}`}>Supplier</button></div>;
}

export function QuickQuoteWidget() {
  const [qty, setQty] = useState(1200);
  return <section className="rounded-hero bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600 dark:text-sky-300">Instant quote</p><h1 className="text-2xl font-black text-slate-950 dark:text-white">Draft buyer quote</h1></div><ThreeDIconOrb icon="◌" tone="blue" /></div><label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Quantity</label><input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 px-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" /><div className="mt-4 rounded-3xl bg-blue-500/10 p-4"><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700 dark:text-sky-300">Estimate</p><b className="text-3xl font-black text-slate-950 dark:text-white">${(qty * 3.1).toLocaleString(undefined,{maximumFractionDigits:0})}</b><p className="text-sm text-slate-500 dark:text-slate-300">Template pricing, freight basis, and quantity band applied.</p></div></section>;
}

export function TradeCaptureForm() {
  const [entity, setEntity] = useState<'buyer' | 'supplier'>('buyer');
  return <section className="rounded-hero bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"><div className="flex items-start justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Capture</p><h1 className="text-2xl font-black text-slate-950 dark:text-white">{entity === 'buyer' ? 'Buyer intake' : 'Supplier intake'}</h1></div><ThreeDIconOrb icon={entity === 'buyer' ? '🛒' : '🏭'} tone={entity === 'buyer' ? 'blue' : 'violet'} /></div><div className="mt-4"><EntitySwitch value={entity} onChange={setEntity} /></div><div className="mt-4 grid gap-3"><input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder={entity === 'buyer' ? 'Buyer company' : 'Supplier company'} /><input className="min-h-12 rounded-2xl border border-slate-200 px-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Contact" /><textarea className="min-h-24 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder={entity === 'buyer' ? 'Need, quantity, target market' : 'MOQ, lead time, source region'} /></div><button className="mt-4 min-h-12 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 font-black text-white">Save {entity}</button></section>;
}

export function AppearancePreview() {
  return <section className="rounded-hero bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"><h2 className="text-xl font-black text-slate-950 dark:text-white">Appearance</h2><div className="mt-3"><ThemeToggle /></div></section>;
}

export function NotificationToast({ message = 'Saved and synced' }: { message?: string }) { return <div role="status" aria-live="polite" className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-xl">{message}</div>; }
export function SettingsList() { return <section className="rounded-hero bg-white/90 p-5 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"><h2 className="text-xl font-black text-slate-950 dark:text-white">Settings</h2>{['Install as app','Push notifications','Offline queue','Mobile theme','Premium icons'].map((item) => <div key={item} className="flex min-h-14 items-center justify-between border-b border-slate-100 text-sm font-bold text-slate-700 last:border-0 dark:border-slate-800 dark:text-slate-200"><span>{item}</span><span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs text-blue-700 dark:text-sky-300">Ready</span></div>)}</section>; }
