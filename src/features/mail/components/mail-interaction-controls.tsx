'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { FolderInput, Mail, MailOpen, Maximize2, Minimize2, Minus, Paperclip, Send, Star, Trash2, X } from 'lucide-react';
import type { FolderSummary } from '@/lib/mail/organization';
import type { MailAttachment } from '../lib/organizer-client';
import type { MailAction } from '../lib/message-actions';
import styles from './mail-interactions.module.css';

export function MailSelectAll({ checked, mixed, disabled, onChange }: { checked: boolean; mixed: boolean; disabled: boolean; onChange: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (input.current) input.current.indeterminate = mixed; }, [mixed]);
  return <input ref={input} type="checkbox" className={styles.checkbox} checked={checked} disabled={disabled} onChange={onChange} aria-label="Select all loaded messages"/>;
}

export function MailSelectionActions({ count, disabled, hasDrafts, onAction, onMove, onDelete, onClear }: {
  count: number; disabled: boolean; hasDrafts: boolean; onAction: (action: MailAction, value: boolean) => void; onMove: () => void; onDelete: () => void; onClear: () => void;
}) {
  return <div className={styles.toolbar} aria-label="Selected message actions">
    <strong className={styles.count}>{count} selected</strong>
    <button className={styles.button} disabled={disabled || hasDrafts} title={hasDrafts ? 'Drafts stay in Drafts until sent.' : 'Move selected messages'} onClick={onMove}><FolderInput size={15}/>Move</button>
    <button className={styles.iconButton} disabled={disabled} title="Mark selected as read" aria-label="Mark selected as read" onClick={() => onAction('read', true)}><MailOpen size={16}/></button>
    <button className={styles.iconButton} disabled={disabled} title="Mark selected as unread" aria-label="Mark selected as unread" onClick={() => onAction('read', false)}><Mail size={16}/></button>
    <button className={styles.iconButton} disabled={disabled} title="Star selected messages" aria-label="Star selected messages" onClick={() => onAction('star', true)}><Star size={16}/></button>
    <button className={`${styles.button} ${styles.danger}`} disabled={disabled} onClick={onDelete}><Trash2 size={15}/>Delete</button>
    <button className={styles.iconButton} disabled={disabled} onClick={onClear} title="Clear selection" aria-label="Clear selection"><X size={16}/></button>
  </div>;
}

export function MailActionDialog({ kind, count, folders, busy, onConfirm, onClose }: {
  kind: 'move' | 'trash' | 'discard'; count: number; folders: FolderSummary[]; busy: boolean;
  onConfirm: (folderId: string | null) => Promise<string | null>; onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null); const titleId = useId();
  const [target, setTarget] = useState('default'); const [error, setError] = useState<string | null>(null);
  const localLock = useRef(false);
  useEffect(() => { const element = ref.current; const previous = document.activeElement as HTMLElement | null; element?.showModal(); return () => { element?.close(); if (previous?.isConnected) previous.focus(); }; }, []);
  async function submit() {
    if (localLock.current || busy) return;
    localLock.current = true; setError(null);
    try { const failure = await onConfirm(target === 'default' ? null : target); if (failure) setError(failure); else onClose(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to apply this action.'); }
    finally { localLock.current = false; }
  }
  const title = kind === 'move' ? 'Move selected messages' : kind === 'discard' ? 'Delete draft?' : `Delete ${count} message${count === 1 ? '' : 's'}?`;
  return <dialog ref={ref} className={styles.dialog} aria-labelledby={titleId} onCancel={e => { e.preventDefault(); if (!busy && !localLock.current) onClose(); }}>
    <div className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button className={styles.iconButton} disabled={busy} onClick={onClose} aria-label="Cancel action"><X size={18}/></button></div>
    <div className={styles.dialogBody}>{kind === 'move' ? <><label htmlFor={`${titleId}-folder`}>Destination folder</label><select id={`${titleId}-folder`} value={target} onChange={e => setTarget(e.target.value)} disabled={busy}><option value="default">Original folder (Inbox or Sent)</option>{folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select></> : <p>{kind === 'discard' ? 'This draft and its attachments will move to Trash.' : 'The selected messages will move to Trash.'} You can restore them from Trash. Nothing is permanently deleted.</p>}{error && <p role="alert" className={styles.error}>{error}</p>}</div>
    <div className={styles.dialogFooter}><button className={styles.button} disabled={busy} onClick={onClose}>Cancel</button><button className={`${styles.button} ${kind === 'move' ? styles.primary : styles.danger}`} disabled={busy} onClick={() => void submit()}>{busy ? 'Saving...' : kind === 'move' ? 'Move messages' : 'Move to Trash'}</button></div>
  </dialog>;
}

export type ComposerFields = { to: string; cc: string; bcc: string; subject: string; body: string };
export function MailComposerPanel({ fields, from, draftId, expanded, minimized, disabled, busyLabel, saveLabel, saveError, signatureOn, attachments, onField, onExpand, onMinimize, onClose, onSend, onUpload, onDelete, onRetry }: {
  fields: ComposerFields; from: string; draftId: string | null; expanded: boolean; minimized: boolean; disabled: boolean; busyLabel: string | null;
  saveLabel: string; saveError: boolean; signatureOn: boolean; attachments: MailAttachment[];
  onField: (key: keyof ComposerFields, value: string) => void; onExpand: () => void; onMinimize: () => void;
  onClose: () => void; onSend: () => void; onUpload: (file: File) => void; onDelete: () => void; onRetry: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <div role="dialog" aria-label="Message composer" data-mail-composer data-expanded={expanded && !minimized} data-minimized={minimized} className={styles.composer}>
    <div className={styles.composeHeader}><span className={styles.composeHeaderTitle}>{fields.subject || (draftId ? 'Draft' : 'New message')}</span><div className={styles.composeControls}>
      <button className={styles.iconButton} disabled={disabled} onClick={onMinimize} title={minimized ? 'Restore composer' : 'Minimize composer'} aria-label={minimized ? 'Restore composer' : 'Minimize composer'}>{minimized ? <Maximize2 size={16}/> : <Minus size={16}/>}</button>
      <button className={styles.iconButton} disabled={disabled} onClick={onExpand} title={expanded ? 'Restore composer size' : 'Expand composer'} aria-label={expanded ? 'Restore composer size' : 'Expand composer'}>{expanded ? <Minimize2 size={16}/> : <Maximize2 size={16}/>}</button>
      <button className={styles.iconButton} disabled={disabled} onClick={onClose} title="Save draft and close" aria-label="Save draft and close"><X size={17}/></button>
    </div></div>
    {!minimized && <><div className={styles.composeBody}><div className={styles.field}><span>From</span><p className="min-w-0 break-all py-1.5">{from}</p></div>
      <fieldset disabled={disabled}>{(['to', 'cc', 'bcc', 'subject'] as const).map(key => <label key={key} className={styles.field}><span>{key === 'to' ? 'To' : key === 'cc' ? 'Cc' : key === 'bcc' ? 'Bcc' : 'Subject'}</span><input aria-label={key === 'to' ? 'To' : key === 'cc' ? 'Cc' : key === 'bcc' ? 'Bcc' : 'Subject'} value={fields[key]} onChange={e => onField(key, e.target.value)} autoComplete="off"/></label>)}
      <textarea aria-label="Message" className={styles.editor} value={fields.body} onChange={e => onField('body', e.target.value)} placeholder="Write your message..."/>
      </fieldset>{attachments.length > 0 && <div className={styles.attachments}>{attachments.map(a => <span key={a.id} className={styles.attachment}>{a.filename}</span>)}</div>}
    </div><div className={styles.composeFooter}><div className={styles.composeControls}>
      <button type="button" className={styles.iconButton} disabled={disabled} onClick={() => fileInput.current?.click()} title="Attach file" aria-label="Attach file"><Paperclip size={18}/></button>
      <input ref={fileInput} type="file" hidden disabled={disabled} onChange={e => { const file = e.currentTarget.files?.[0]; e.currentTarget.value = ''; if (file) onUpload(file); }}/>
      <button type="button" className={`${styles.iconButton} ${styles.danger}`} disabled={disabled} onClick={onDelete} title="Delete draft" aria-label="Delete draft"><Trash2 size={18}/></button>
    </div><span className={styles.helper}>Plain text{signatureOn ? ' · Signature on' : ''}</span><button className={`${styles.button} ${styles.primary}`} disabled={disabled || !fields.to.trim()} onClick={onSend}><Send size={16}/>{busyLabel === 'Sending...' ? busyLabel : 'Send'}</button></div></>}
    <div className={styles.status}><span role="status" aria-live="polite">{busyLabel || saveLabel}</span>{saveError && <button className={styles.button} disabled={disabled} onClick={onRetry}>Retry save</button>}</div>
  </div>;
}
