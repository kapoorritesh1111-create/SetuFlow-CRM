'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SETU_FLOW_AVATAR_PRESETS } from '@/lib/profile/avatar-presets';

export function ProfileCompactAvatarManager({
  initialAvatarUrl,
  fullName,
  email,
}: {
  initialAvatarUrl?: string | null;
  fullName: string;
  email?: string | null;
}) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  async function saveAvatar(payload: { avatarUrl?: string; imageDataUrl?: string; fileName?: string }, successMessage: string) {
    setIsSaving(true);
    setMessage('Saving profile image...');
    try {
      const response = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not save profile image.');
      setAvatarUrl(result.avatarUrl || payload.avatarUrl || '');
      setMessage(successMessage);
      setIsPickerOpen(false);
      window.setTimeout(() => setMessage(''), 2200);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save profile image.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAvatarFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Choose an image file.');
      return;
    }
    if (file.size > 5_000_000) {
      setMessage('Choose an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      void saveAvatar({ imageDataUrl: String(reader.result ?? ''), fileName: file.name || 'profile-photo' }, 'Profile photo saved.');
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={fullName} email={email ?? undefined} avatarUrl={avatarUrl} size="xl" className="h-20 w-20 border border-slate-200 shadow-sm" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Profile image</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Photo or avatar</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Upload a photo or pick a Setu Flow avatar without opening the full vCard gallery.</p>
            {message ? <p className="mt-2 text-xs font-semibold text-[#1F487C]">{message}</p> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            {isSaving ? 'Saving...' : 'Upload photo'}
            <input type="file" accept="image/*" className="sr-only" disabled={isSaving} onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
          </label>
          <button type="button" onClick={() => setIsPickerOpen(true)} disabled={isSaving} className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:bg-slate-400">
            Select avatar
          </button>
        </div>
      </div>

      {isPickerOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[86vh] w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Avatar library</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">Choose a profile avatar</h3>
                <p className="mt-1 text-sm text-slate-600">This updates your app profile image. The full gallery stays in vCard.</p>
              </div>
              <button type="button" onClick={() => setIsPickerOpen(false)} className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Close</button>
            </div>
            <div className="grid max-h-[62vh] gap-3 overflow-y-auto p-5 sm:grid-cols-2 lg:grid-cols-4">
              {SETU_FLOW_AVATAR_PRESETS.map((preset) => (
                <button key={preset.id} type="button" onClick={() => void saveAvatar({ avatarUrl: preset.url }, `${preset.name} saved.`)} disabled={isSaving} className={`rounded-2xl border p-3 text-center transition hover:shadow-md ${avatarUrl === preset.url ? 'border-[#1F487C] bg-[#eef6fb]' : 'border-slate-200 bg-white'}`}>
                  <img src={preset.url} alt="" className="mx-auto h-20 w-20 rounded-2xl border border-slate-100 object-cover" />
                  <p className="mt-3 text-sm font-semibold text-slate-900">{preset.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
