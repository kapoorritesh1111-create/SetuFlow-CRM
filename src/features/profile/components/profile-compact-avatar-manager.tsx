'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';

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
    reader.onload = async () => {
      setIsSaving(true);
      setMessage('Saving profile photo...');
      try {
        const response = await fetch('/api/profile/avatar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageDataUrl: String(reader.result ?? ''), fileName: file.name || 'profile-photo' }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) throw new Error(payload?.error || 'Could not save profile photo.');
        setAvatarUrl(payload.avatarUrl || '');
        setMessage('Profile photo saved.');
        window.setTimeout(() => setMessage(''), 2200);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Could not save profile photo.');
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white/95 p-5 shadow-soft">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <UserAvatar name={fullName} email={email ?? undefined} avatarUrl={avatarUrl} size="xl" className="h-20 w-20 border border-slate-200 shadow-sm" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-700">Profile photo</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Avatar & image</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Use a clean photo or branded avatar for the app shell. The full illustrated gallery stays in the vCard workspace.</p>
            {message ? <p className="mt-2 text-xs font-semibold text-[#1F487C]">{message}</p> : null}
          </div>
        </div>
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
          {isSaving ? 'Saving...' : 'Upload photo'}
          <input type="file" accept="image/*" className="sr-only" disabled={isSaving} onChange={(event) => handleAvatarFile(event.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}
