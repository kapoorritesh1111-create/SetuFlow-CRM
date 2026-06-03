'use client';

import { useState } from 'react';
import type { MyCardSettingsInput } from '@/lib/contact-exchange/my-card-settings-shared';

const contactFields: Array<{ key: keyof Pick<MyCardSettingsInput, 'primaryPhone' | 'website' | 'linkedin' | 'instagram'>; label: string; icon: string; placeholder: string }> = [
  { key: 'primaryPhone', label: 'Phone', icon: '☎', placeholder: '+1 555-555-5555' },
  { key: 'website', label: 'Website', icon: '↗', placeholder: 'https://example.com' },
  { key: 'linkedin', label: 'LinkedIn', icon: 'in', placeholder: 'https://linkedin.com/in/name' },
  { key: 'instagram', label: 'Instagram', icon: '◎', placeholder: 'https://instagram.com/name' },
];

export function ProfileVcardContactEditor({
  initialSettings,
  organizationId,
  fullName,
  email,
}: {
  initialSettings: MyCardSettingsInput;
  organizationId: string | null;
  fullName: string;
  email: string;
}) {
  const [settings, setSettings] = useState<MyCardSettingsInput>(initialSettings);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState('');

  function updateField(key: keyof MyCardSettingsInput, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
    if (saveState !== 'idle') {
      setSaveState('idle');
      setMessage('');
    }
  }

  async function saveContactDetails() {
    setSaveState('saving');
    setMessage('Saving contact details...');
    try {
      const response = await fetch('/api/my-card-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, fullName, email, settings }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'Unable to save contact details.');
      setSettings(payload.settings || settings);
      setSaveState('saved');
      setMessage('Saved to your vCard contact details.');
      window.setTimeout(() => {
        setSaveState('idle');
        setMessage('');
      }, 2200);
    } catch (error) {
      setSaveState('error');
      setMessage(error instanceof Error ? error.message : 'Unable to save contact details.');
    }
  }

  const ready = Boolean(settings.primaryPhone.trim() && settings.website.trim());

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">vCard helper</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Contact preview</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">Edit the public contact details shown from your vCard. Share links and QR actions stay in Share vCard.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${ready ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
          {ready ? 'Ready' : 'Needs details'}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {contactFields.map((field) => (
          <label key={field.key} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/85 px-4 py-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white" aria-hidden="true">{field.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{field.label}</span>
              <input
                value={settings[field.key]}
                onChange={(event) => updateField(field.key, event.target.value)}
                placeholder={field.placeholder}
                className="mt-1 w-full border-0 bg-transparent p-0 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
              />
            </span>
          </label>
        ))}
      </div>

      <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
        Public share links and QR actions are generated from Share vCard, so they stay out of the Profile page.
      </p>

      {message ? (
        <p className={`mt-3 text-sm font-semibold ${saveState === 'error' ? 'text-red-700' : 'text-[#1F487C]'}`}>{message}</p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => void saveContactDetails()} disabled={saveState === 'saving'} className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
          {saveState === 'saving' ? 'Saving...' : 'Save contact details'}
        </button>
        <a href="/contact-exchange/vcard" className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
          Manage vCard
        </a>
      </div>
    </div>
  );
}
