'use client';

import { useMemo, useState } from 'react';

type Props = { initialAvatarUrl?: string | null; fullName?: string | null; email?: string | null };

const avatarStyles = ['bottts-neutral', 'initials', 'adventurer-neutral', 'lorelei-neutral', 'thumbs'];

function seedFrom(value?: string | null) {
  return encodeURIComponent((value || 'Setu Flow User').trim() || 'Setu Flow User');
}

export function ProfileAvatarManager({ initialAvatarUrl, fullName, email }: Props) {
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? '');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState(`${fullName || email || 'professional'} profile avatar`);
  const seed = seedFrom(fullName || email);
  const suggestions = useMemo(() => avatarStyles.map((style) => `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`), [seed]);

  async function saveAvatar(payload: Record<string, string>) {
    setIsSaving(true);
    setMessage('Saving avatar...');
    try {
      const response = await fetch('/api/profile/avatar', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || 'Could not save avatar.');
      setAvatarUrl(result.avatarUrl || payload.avatarUrl || '');
      setMessage('Avatar saved to your profile.');
      window.setTimeout(() => setMessage(''), 2200);
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
    if (file.size > 4_000_000) {
      setMessage('Choose an image under 4MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => void saveAvatar({ imageDataUrl: String(reader.result || ''), fileName: file.name });
    reader.readAsDataURL(file);
  }

  function openWebSearch() {
    const search = query.trim() || 'professional avatar headshot';
    window.open(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(search)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center gap-4">
        {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white">SF</div>}
        <div>
          <p className="text-sm font-semibold text-slate-900">Avatar & image</p>
          <p className="mt-1 text-sm text-slate-600">Uploaded images are saved through the Supabase avatars bucket and synced back to your profile.</p>
        </div>
      </div>

      <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
        Upload avatar image
        <input type="file" accept="image/*" className="mt-2 block w-full text-sm text-slate-600" disabled={isSaving} onChange={(event) => handleFile(event.target.files?.[0])} />
      </label>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search web for avatar inspiration" aria-label="Search web for avatars" />
          <button type="button" onClick={openWebSearch} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Search web</button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {suggestions.map((url, index) => (
            <button key={url} type="button" disabled={isSaving} onClick={() => void saveAvatar({ avatarUrl: url })} className="rounded-2xl border border-slate-200 bg-white p-2 transition hover:border-slate-400 disabled:opacity-60">
              <img src={url} alt={`Recommended avatar ${index + 1}`} className="mx-auto h-14 w-14 rounded-full object-cover" />
              <span className="mt-2 block text-[11px] font-semibold text-slate-600">Use avatar</span>
            </button>
          ))}
        </div>
      </div>
      {message ? <p className="text-sm font-medium text-slate-600">{message}</p> : null}
    </div>
  );
}
