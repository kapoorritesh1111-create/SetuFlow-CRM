'use client';

import { useState } from 'react';
import { Copy, Loader2, Mail, MessageCircle, PenSquare, Save, Sparkles, X } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { workspaceFieldSurfaceClass, workspaceInsetClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

type Draft = {
  leadId: string;
  channel: 'whatsapp' | 'email' | 'linkedin';
  goal: 'send_catalog' | 'book_meeting' | 'follow_up_quote' | 'request_supplier_pricing';
  tone: 'short' | 'warm' | 'professional' | 'trade_show_follow_up';
  subject: string | null;
  body: string;
  productsReferenced: string[];
  usedFacts: string[];
};

type OutreachGeneratorLauncherProps = {
  leadId: string;
  email?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
};

function normalizeWhatsApp(value?: string | null) {
  return (value ?? '').replace(/[^0-9]/g, '');
}

export function OutreachGeneratorLauncher({ leadId, email, phone, whatsappNumber }: OutreachGeneratorLauncherProps) {
  const [open, setOpen] = useState(false);
  const [channel, setChannel] = useState<Draft['channel']>('whatsapp');
  const [goal, setGoal] = useState<Draft['goal']>('send_catalog');
  const [tone, setTone] = useState<Draft['tone']>('warm');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setSavedMessage(null);
    try {
      const response = await fetch('/api/setu-guru/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, channel, goal, tone }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Setu Guru could not draft this message.');
      setDraft(body.draft as Draft);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Setu Guru could not draft this message.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/setu-guru/outreach/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || 'Setu Guru could not save this draft.');
      setSavedMessage('Saved to this lead’s activity history as a draft.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Setu Guru could not save this draft.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const whatsapp = normalizeWhatsApp(whatsappNumber || phone);
  const whatsappHref = draft && whatsapp ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(draft.body)}` : null;
  const emailHref = draft && email
    ? `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(draft.subject || 'Setu Flow follow-up')}&body=${encodeURIComponent(draft.body)}`
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 w-full items-center justify-start gap-2 rounded-ctl px-3.5 text-sm font-medium')}
      >
        <PenSquare className="h-4 w-4" aria-hidden="true" />
        Draft outreach
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label="Setu Guru outreach generator">
          <button type="button" aria-label="Close outreach generator" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default" />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface-1 shadow-hero">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <GuruAvatar size="md" />
                <div>
                  <p className="text-sm font-medium text-content-primary">Outreach Generator</p>
                  <p className="text-xs text-content-muted">Review the message, then send it directly</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-ctl p-1.5 text-content-muted transition hover:bg-surface-2" aria-label="Close">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs font-medium text-content-primary">
                  Channel
                  <select className={cn(workspaceFieldSurfaceClass, 'mt-1 h-10 w-full rounded-ctl border px-2 text-sm')} value={channel} onChange={(event) => setChannel(event.target.value as Draft['channel'])}>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-content-primary">
                  Goal
                  <select className={cn(workspaceFieldSurfaceClass, 'mt-1 h-10 w-full rounded-ctl border px-2 text-sm')} value={goal} onChange={(event) => setGoal(event.target.value as Draft['goal'])}>
                    <option value="send_catalog">Send catalog</option>
                    <option value="book_meeting">Book meeting</option>
                    <option value="follow_up_quote">Follow up quote</option>
                    <option value="request_supplier_pricing">Request supplier pricing</option>
                  </select>
                </label>
                <label className="block text-xs font-medium text-content-primary">
                  Tone
                  <select className={cn(workspaceFieldSurfaceClass, 'mt-1 h-10 w-full rounded-ctl border px-2 text-sm')} value={tone} onChange={(event) => setTone(event.target.value as Draft['tone'])}>
                    <option value="short">Short</option>
                    <option value="warm">Warm</option>
                    <option value="professional">Professional</option>
                    <option value="trade_show_follow_up">Trade show follow-up</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-ctl text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60')}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                Generate draft
              </button>

              {error ? <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div> : null}

              {draft ? (
                <div className={cn(workspaceInsetClass, 'p-4')}>
                  {draft.subject ? <p className="text-xs font-medium text-content-muted">Subject: {draft.subject}</p> : null}
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-content-primary">{draft.body}</p>

                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {whatsappHref ? (
                      <a href={whatsappHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl bg-success-fg px-3 text-sm font-medium text-white hover:opacity-90">
                        <MessageCircle className="h-4 w-4" />
                        Send WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex min-h-10 items-center justify-center rounded-ctl border border-warning-border bg-warning-bg px-3 text-sm text-warning-fg">Add WhatsApp number</span>
                    )}
                    {emailHref ? (
                      <a href={emailHref} className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-3 text-sm font-medium')}>
                        <Mail className="h-4 w-4" />
                        Send email
                      </a>
                    ) : (
                      <span className="inline-flex min-h-10 items-center justify-center rounded-ctl border border-warning-border bg-warning-bg px-3 text-sm text-warning-fg">Add email address</span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                    <button type="button" onClick={handleCopy} className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-xs font-medium')}>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60')}
                    >
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                      Save draft
                    </button>
                  </div>
                  {savedMessage ? <p className="mt-3 text-xs font-medium text-success-fg">{savedMessage}</p> : null}
                </div>
              ) : null}

              <p className="text-xs text-content-muted">Nothing is sent until you choose WhatsApp or email.</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
