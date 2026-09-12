'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FolderInput, Mail, MailOpen, Maximize2, Minimize2, Minus, Paperclip, Send, ShieldAlert, Sparkles, Star, Trash2, UserRoundCheck, X } from 'lucide-react';
import type { FolderSummary } from '@/lib/mail/organization';
import type { MailAttachment } from '../lib/organizer-client';
import type { MailAction } from '../lib/message-actions';
import { RichMailEditor } from './rich-mail-editor';
import styles from './mail-interactions.module.css';

export function MailSelectAll({ checked, mixed, disabled, onChange }: { checked: boolean; mixed: boolean; disabled: boolean; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = mixed; }, [mixed]);
  return <input ref={input} type="checkbox" className={styles.checkbox} checked={checked} disabled={disabled} onChange={onChange} aria-label="Select all loaded messages"/>;
}

export function MailSelectionActions({ count, disabled, hasDrafts, junkMode, canJunk, onAction, onMove, onDelete, onJunk, onClear }: {
  count: number; disabled: boolean; hasDrafts: boolean; junkMode: boolean; canJunk: boolean;
  onAction: (action: MailAction, value: boolean) => void; onMove: () => void; onDelete: () => void; onJunk: (junk: boolean) => void; onClear: () => void;
}) {
  return <div className={styles.toolbar} aria-label="Selected message actions">
    <strong className={styles.count}>{count} selected</strong>
    <button className={styles.button} disabled={disabled || hasDrafts} title={hasDrafts ? 'Drafts stay in Drafts until sent.' : 'Move selected messages'} onClick={onMove}><FolderInput size={15}/>Move</button>
    <button className={styles.iconButton} disabled={disabled} title="Mark selected as read" aria-label="Mark selected as read" onClick={() => onAction('read', true)}><MailOpen size={16}/></button>
    <button className={styles.iconButton} disabled={disabled} title="Mark selected as unread" aria-label="Mark selected as unread" onClick={() => onAction('read', false)}><Mail size={16}/></button>
    <button className={styles.iconButton} disabled={disabled} title="Star selected messages" aria-label="Star selected messages" onClick={() => onAction('star', true)}><Star size={16}/></button>
    {canJunk && <button className={styles.button} disabled={disabled || hasDrafts} onClick={() => onJunk(!junkMode)}>{junkMode ? <UserRoundCheck size={15}/> : <ShieldAlert size={15}/>} {junkMode ? 'Not junk' : 'Junk'}</button>}
    <button className={`${styles.button} ${styles.danger}`} disabled={disabled} onClick={onDelete}><Trash2 size={15}/>Delete</button>
    <button className={styles.iconButton} disabled={disabled} onClick={onClear} title="Clear selection" aria-label="Clear selection"><X size={16}/></button>
  </div>;
}

export function MailActionDialog({ kind, count, folders, busy, onConfirm, onClose }: {
  kind: 'move' | 'trash' | 'discard'; count: number; folders: FolderSummary[]; busy: boolean;
  onConfirm: (folderId: string | null) => Promise<string | null>; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null); const titleId = useId();
  const [target, setTarget] = useState('default'); const [error, setError] = useState<string | null>(null); const localLock = useRef(false);
  useEffect(() => { const element = ref.current; const previous = document.activeElement as HTMLElement | null; element?.showModal(); return () => { element?.close(); if (previous?.isConnected) previous.focus(); }; }, []);
  async function submit() { if (localLock.current || busy) return; localLock.current = true; setError(null); try { const failure = await onConfirm(target === 'default' ? null : target); if (failure) setError(failure); else onClose(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to apply this action.'); } finally { localLock.current = false; } }
  const title = kind === 'move' ? 'Move selected messages' : kind === 'discard' ? 'Delete draft?' : `Delete ${count} message${count === 1 ? '' : 's'}?`;
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy && !localLock.current) onClose(); }}>
    <div className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button className={styles.iconButton} disabled={busy} onClick={onClose} aria-label="Cancel action"><X size={18}/></button></div>
    <div className={styles.dialogBody}>{kind === 'move' ? <><label htmlFor={`${titleId}-folder`}>Destination folder</label><select id={`${titleId}-folder`} value={target} onChange={e => setTarget(e.target.value)} disabled={busy}><option value="default">Original folder (Inbox or Sent)</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></> : <p>{kind === 'discard' ? 'This draft and its attachments will move to Trash.' : 'The selected messages will move to Trash.'} You can restore them from Trash. Nothing is permanently deleted.</p>}{error && <p role="alert" className={styles.error}>{error}</p>}</div>
    <div className={styles.dialogFooter}><button className={styles.button} disabled={busy} onClick={onClose}>Cancel</button><button className={`${styles.button} ${kind === 'move' ? styles.primary : styles.danger}`} disabled={busy} onClick={() => void submit()}>{busy ? 'Saving...' : kind === 'move' ? 'Move messages' : 'Move to Trash'}</button></div>
  </dialog>;
}

export type ComposerFields = { to: string; cc: string; bcc: string; subject: string; body: string; html: string };
export type ComposeCrmContext = null | { company_name?: string | null; contact_name?: string | null; lead_type?: string | null; stage_name?: string | null; next_follow_up_at?: string | null; deal_value?: number | null; deal_currency?: string | null; href?: string | null; createCrmHref?: string | null };
export type GuruPreview = { suggestion: string; action: string } | null;
type RecipientSuggestion = { email: string; name: string | null; company: string | null; source: 'contact' | 'crm' | 'history' };

function recipientFragment(value: string) {
  return value.split(',').pop()?.trim() ?? '';
}

function RecipientInput({ label, value, disabled, onChange }: { label: 'To' | 'Cc' | 'Bcc'; value: string; disabled: boolean; onChange: (value: string) => void }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const fragment = recipientFragment(value);
  useEffect(() => {
    if (disabled || fragment.length < 1 || fragment.includes('@') && fragment.includes('.')) { setSuggestions([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/mail/recipient-suggestions?q=${encodeURIComponent(fragment)}`, { cache: 'no-store' });
        const payload = await response.json();
        if (active) setSuggestions(response.ok ? payload.suggestions ?? [] : []);
      } catch { if (active) setSuggestions([]); }
    }, 140);
    return () => { active = false; clearTimeout(timer); };
  }, [fragment, disabled]);
  function change(next: string) {
    const selected = suggestions.find(item => item.email.toLowerCase() === next.trim().toLowerCase());
    if (selected && value.includes(',')) {
      const comma = value.lastIndexOf(',');
      onChange(`${value.slice(0, comma + 1)} ${selected.email}`);
      return;
    }
    onChange(next);
  }
  return <><input aria-label={label} list={listId} value={value} onChange={e => change(e.target.value)} autoComplete="off"/><datalist id={listId}>{suggestions.map(item => <option key={item.email} value={item.email}>{[item.name, item.company, item.email].filter(Boolean).join(' · ')}</option>)}</datalist></>;
}

export function MailComposerPanel({ fields, from, draftId, expanded, minimized, disabled, busyLabel, saveLabel, saveError, signatureOn, signatureText, includeSignature, attachments, crmContext, crmLoading, guruPreview, guruBusy, onField, onEditor, onSignatureToggle, onExpand, onMinimize, onClose, onSend, onUpload, onRemoveAttachment, onDelete, onRetry, onGuru, onGuruInsert, onGuruRegenerate }: {
  fields: ComposerFields; from: string; draftId: string | null; expanded: boolean; minimized: boolean; disabled: boolean; busyLabel: string | null;
  saveLabel: string; saveError: boolean; signatureOn: boolean; signatureText: string; includeSignature: boolean; attachments: MailAttachment[];
  crmContext: ComposeCrmContext; crmLoading: boolean; guruPreview: GuruPreview; guruBusy: boolean;
  onField: (key: keyof ComposerFields, value: string) => void; onEditor: (html: string, text: string) => void; onSignatureToggle: (value: boolean) => void;
  onExpand: () => void; onMinimize: () => void; onClose: () => void; onSend: () => void; onUpload: (file: File) => void; onRemoveAttachment: (id: string) => void; onDelete: () => void; onRetry: () => void;
  onGuru: (action: string) => void; onGuruInsert: () => void; onGuruRegenerate: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [showCopies, setShowCopies] = useState(Boolean(fields.cc || fields.bcc));
  useEffect(() => { if (fields.cc || fields.bcc) setShowCopies(true); }, [fields.cc, fields.bcc]);
  return <div role="dialog" aria-label={draftId ? 'Edit draft' : 'New message'} data-mail-composer data-expanded={expanded && !minimized} data-minimized={minimized} className={styles.composer}>
    <div className={styles.composeHeader}><span className={styles.composeHeaderTitle}>{fields.subject || (draftId ? 'Draft' : 'New message')}</span><div className={styles.composeControls}>
      <button className={styles.iconButton} disabled={disabled} onClick={onMinimize} title={minimized ? 'Restore composer' : 'Minimize composer'} aria-label={minimized ? 'Restore composer' : 'Minimize composer'}>{minimized ? <Maximize2 size={16}/> : <Minus size={16}/>}</button>
      <button className={styles.iconButton} disabled={disabled} onClick={onExpand} title={expanded ? 'Restore composer size' : 'Expand composer'} aria-label={expanded ? 'Restore composer size' : 'Expand composer'}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button>
      <button className={styles.iconButton} disabled={disabled} onClick={onClose} title="Save draft and close" aria-label="Save draft and close"><X size={17}/></button>
    </div></div>
    {!minimized && <><div className={styles.composeBody}><div className={styles.field}><span>From</span><p className="min-w-0 break-all py-1.5">{from}</p></div>
      <fieldset disabled={disabled}>
        <label className={styles.field}><span>To</span><RecipientInput label="To" value={fields.to} disabled={disabled} onChange={value => onField('to', value)}/><button type="button" className={styles.copyToggle} onClick={() => setShowCopies(v => !v)}>{showCopies ? 'Hide Cc/Bcc' : 'Cc/Bcc'}</button></label>
        {showCopies && <><label className={styles.field}><span>Cc</span><RecipientInput label="Cc" value={fields.cc} disabled={disabled} onChange={value => onField('cc', value)}/></label><label className={styles.field}><span>Bcc</span><RecipientInput label="Bcc" value={fields.bcc} disabled={disabled} onChange={value => onField('bcc', value)}/></label></>}
        <label className={styles.field}><span>Subject</span><input aria-label="Subject" value={fields.subject} onChange={e => onField('subject', e.target.value)} autoComplete="off"/></label>
        <RichMailEditor html={fields.html} disabled={disabled} onChange={onEditor}/>
      </fieldset>
      {crmLoading ? <div className={styles.contextCard}><Sparkles size={15}/><span>Looking up recipient CRM context…</span></div> : crmContext?.href || crmContext?.company_name || crmContext?.contact_name ? <div className={styles.contextCard}><UserRoundCheck size={15}/><div><strong>{crmContext.company_name || crmContext.contact_name || 'CRM match'}</strong>{crmContext.stage_name && <span> · {crmContext.stage_name}</span>}{crmContext.next_follow_up_at && <span> · Follow-up {new Date(crmContext.next_follow_up_at).toLocaleDateString()}</span>}{crmContext.href && <a href={crmContext.href}>Open lead</a>}</div></div> : fields.to.trim() ? <div className={styles.contextCard}><span>No accessible CRM lead matched the first recipient.</span>{crmContext?.createCrmHref && <a href={crmContext.createCrmHref}>Create lead</a>}</div> : null}
      <div className={styles.guruBar}><div className={styles.guruLabel}><Sparkles size={15}/><strong>Setu Guru</strong><span>Preview only — never sends or changes CRM.</span></div><div className={styles.guruActions}>{[['improve','Improve'],['professional','Professional'],['shorter','Shorter'],['warmer','Warmer'],['draft_follow_up','Follow-up'],['suggest_subject','Subject']].map(([key,label]) => <button key={key} type="button" className={styles.button} disabled={disabled || guruBusy} onClick={() => onGuru(key)}>{label}</button>)}</div>{guruPreview && <div className={styles.guruPreview}><pre>{guruPreview.suggestion}</pre><div><button type="button" className={`${styles.button} ${styles.primary}`} disabled={disabled || guruBusy} onClick={onGuruInsert}>Insert</button><button type="button" className={styles.button} disabled={disabled || guruBusy} onClick={onGuruRegenerate}>{guruBusy ? 'Generating…' : 'Regenerate'}</button></div></div>}</div>
      {attachments.length > 0 && <div className={styles.attachments}>{attachments.map(a => <span key={a.id} className={styles.attachment}><Paperclip size={14}/><span>{a.filename}</span><button type="button" disabled={disabled} aria-label={`Remove attachment ${a.filename}`} onClick={() => onRemoveAttachment(a.id)}><X size={14}/></button></span>)}</div>}
      {signatureOn && <div className={styles.signaturePreview}><label><input type="checkbox" checked={includeSignature} disabled={disabled} onChange={e => onSignatureToggle(e.target.checked)}/> Include signature</label>{includeSignature && <div className="whitespace-pre-wrap">{signatureText || 'Signature configured'}</div>}</div>}
    </div><div className={styles.composeFooter}><div className={styles.composeControls}>
      <button type="button" className={styles.iconButton} disabled={disabled} onClick={() => fileInput.current?.click()} title="Attach file" aria-label="Attach file"><Paperclip size={18}/></button>
      <input ref={fileInput} type="file" hidden disabled={disabled} onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) onUpload(file); }}/>
      <button type="button" className={`${styles.iconButton} ${styles.danger}`} disabled={disabled} onClick={onDelete} title="Delete draft" aria-label="Delete draft"><Trash2 size={18}/></button>
    </div><span className={styles.helper}>Rich text{includeSignature && signatureOn ? ' · Signature on' : ''}</span><button className={`${styles.button} ${styles.primary}`} disabled={disabled || !fields.to.trim()} onClick={onSend}><Send size={16}/>{busyLabel === 'Sending...' ? busyLabel : 'Send'}</button></div></>}
    <div className={styles.status}><span role="status" aria-live="polite">{guruBusy ? 'Setu Guru is preparing a preview…' : busyLabel || saveLabel}</span>{saveError && <button className={styles.button} disabled={disabled} onClick={onRetry}>Retry save</button>}</div>
  </div>;
}
