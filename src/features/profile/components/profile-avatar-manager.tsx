'use client';

import { useState } from 'react';
import { UserAvatar } from '@/components/ui/user-avatar';
import { isSetuFlowAvatarPresetUrl } from '@/lib/profile/avatar-presets';
import { SetuFlowAvatarPicker } from './setu-flow-avatar-picker';

type Props = { initialAvatarUrl?: string | null; fullName?: string | null; email?: string | null };

export function ProfileAvatarManager({ initialAvatarUrl, fullName, email }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState(`${fullName || email || 'professional'} illustrated avatar`);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function saveAvatar(payload: Record<string, string>) {
    setIsSaving(true);
    setMessage('Saving avatar...');
    try {
      const response = await fetch('/api/profile/avatar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not save avatar.');
      setAvatarUrl(result.avatarUrl || payload.avatarUrl || '');
      setPreviewUrl(null);
      setMessage('Avatar saved. It will now appear across Setu Flow and your digital vCard.');
      window.setTimeout(() => setMessage(''), 2600);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save avatar.');
    } finally {
      setIsSaving(false);
    }
  }

  function handleFile(file?: File | null) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Choose an image file.');
      return;
    }
    if (file.size > 5_000_000) {
      setMessage('Choose an image under 5MB.');
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    const reader = new FileReader();
    reader.onload = () => void saveAvatar({ imageDataUrl: String(reader.result || ''), fileName: file.name });
    reader.readAsDataURL(file);
  }

  function openWebSearch() {
    const search = query.trim() || 'illustrated avatar for business profile';
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(search)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-hero border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              {previewUrl ? (
                <img src={previewUrl} alt="Profile avatar preview" className="h-24 w-24 rounded-full object-cover ring-4 ring-white shadow-soft" />
              ) : (
                <UserAvatar name={fullName} email={email} avatarUrl={avatarUrl} size="xl" className="ring-4 ring-white shadow-soft" />
              )}
              <span className="absolute -bottom-1 -right-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                Live
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">Profile avatar</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">Avatar & image</h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Use the approved Setu Flow avatar collection, upload your own photo, or keep a clean branded monogram.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              Upload profile image
              <span className="mt-1 block text-xs font-normal text-slate-500">
                PNG, JPG, WEBP, or GIF. Stored in Supabase Storage under your own avatar folder.
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="mt-3 block w-full text-sm text-slate-600"
                disabled={isSaving}
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </label>
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Search the web</p>
                <p className="text-xs leading-5 text-slate-500">Temporary helper for outside inspiration while Setu Flow keeps the approved in-app set.</p>
              </div>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search web for avatar inspiration"
                aria-label="Search web for avatars"
              />
              <button
                type="button"
                onClick={openWebSearch}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Search web
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => void saveAvatar({ avatarUrl: '/avatars/setu-flow-exclusive/avatar-15-monogram-classic.png' })}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Use Setu Flow monogram
          </button>
          {message ? <p className="text-sm font-medium text-slate-600">{message}</p> : null}
        </div>
      </div>

      <SetuFlowAvatarPicker
        selectedUrl={isSetuFlowAvatarPresetUrl(avatarUrl) ? avatarUrl : null}
        onSelect={(nextUrl) => void saveAvatar({ avatarUrl: nextUrl })}
        disabled={isSaving}
      />
    </div>
  );
}
