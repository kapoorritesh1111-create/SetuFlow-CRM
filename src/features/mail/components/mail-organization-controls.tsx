'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Folder, FolderInput, FolderPlus, Pencil, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { folderName, validateRule, type FolderSummary } from '@/lib/mail/organization';
import { describeRule, type MailRule, type OrganizedMessage } from '../lib/organizer-client';
import type { MailOrganizer } from '../lib/use-mail-organizer';
import styles from './mail-organization.module.css';

function errorText(error: unknown) { return error instanceof Error ? error.message : 'Unable to save this change. Please try again.'; }

function MailModal({ title, busy, onClose, children }: { title: string; busy: boolean; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const previous = document.activeElement as HTMLElement | null;
    if (element && !element.open) element.showModal();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <div className={styles.dialogHeader}><h2 id={titleId}>{title}</h2><button type="button" className={styles.iconButton} disabled={busy} onClick={onClose} aria-label="Close dialog" title="Close"><X size={18}/></button></div>
    {children}
  </dialog>;
}

export function MailFolderSidebar({ organizer, activeId, onSelect, onDeleted }: { organizer: MailOrganizer; activeId: string | null; onSelect: (id: string) => void; onDeleted: (id: string) => void }) {
  const [editing, setEditing] = useState<{ folder?: FolderSummary; remove?: boolean } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  function open(folder?: FolderSummary, remove = false) { setName(folder?.name ?? ''); setError(null); setEditing({ folder, remove }); }
  async function save() {
    if (!editing) return;
    setError(null);
    try {
      if (editing.remove && editing.folder) {
        await organizer.mutate({ action: 'deleteFolder', id: editing.folder.id });
        onDeleted(editing.folder.id);
      } else {
        const clean = folderName(name);
        await organizer.mutate({ action: editing.folder ? 'renameFolder' : 'createFolder', id: editing.folder?.id, name: clean.name });
      }
      setEditing(null);
    } catch (e) { setError(errorText(e)); }
  }
  return <div className={styles.sidebar}>
    <div className={styles.sectionHeader}><h3>Folders</h3>{organizer.canManage && <button type="button" className={styles.iconButton} disabled={organizer.busy} title="Create folder" aria-label="Create folder" onClick={() => open()}><FolderPlus size={16}/></button>}</div>
    {organizer.loading && <p role="status" className={styles.helper}>Loading folders...</p>}
    {organizer.error && <div role="alert" className={styles.error}>{organizer.error}<button type="button" className={styles.textButton} onClick={() => void organizer.reload()}>Retry</button></div>}
    {!organizer.loading && !organizer.error && !organizer.folders.length && <p className={styles.helper}>Organize mail by customer, supplier, or project.</p>}
    <nav aria-label="Custom mail folders">{organizer.folders.map(folder => {
      const usedByRule = organizer.rules.some(rule => rule.target_folder_id === folder.id);
      const deleteReason = Number(folder.message_count) > 0 ? 'Move all messages out before deleting this folder.' : usedByRule ? 'Remove or edit rules using this folder first.' : 'Delete empty folder';
      return <div className={styles.folderRow} key={folder.id} data-active={activeId === folder.id}>
        <button type="button" className={styles.folderLink} onClick={() => onSelect(folder.id)} aria-current={activeId === folder.id ? 'page' : undefined} title={`${folder.name}: ${folder.message_count} messages, ${folder.unread_count} unread`}>
          <Folder size={16}/><span className={styles.truncate}>{folder.name}</span><span className={styles.count} aria-label={`${folder.message_count} messages`}>{folder.message_count}</span>
          {Number(folder.unread_count) > 0 && <span className={styles.unreadDot} aria-label={`${folder.unread_count} unread`}/>}
        </button>
        {organizer.canManage && <><button type="button" className={styles.iconButton} title={`Rename ${folder.name}`} aria-label={`Rename ${folder.name}`} disabled={organizer.busy} onClick={() => open(folder)}><Pencil size={13}/></button><button type="button" className={styles.iconButton} title={deleteReason} aria-label={`Delete ${folder.name}`} disabled={organizer.busy || Number(folder.message_count) > 0 || usedByRule} onClick={() => open(folder, true)}><Trash2 size={13}/></button></>}
      </div>;
    })}</nav>
    {organizer.canManage && <button type="button" className={styles.textButton} disabled={organizer.busy} onClick={() => open()}><Plus size={15}/>New folder</button>}
    {!organizer.error && <button type="button" className={styles.rulesLink} onClick={() => setRulesOpen(true)}><SlidersHorizontal size={16}/>{organizer.canManage ? 'Manage rules' : 'View rules'}<span className={styles.count}>{organizer.rules.length}</span></button>}
    {editing && <MailModal title={editing.remove ? 'Delete empty folder' : editing.folder ? 'Rename folder' : 'Create folder'} busy={organizer.busy} onClose={() => setEditing(null)}>
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <div className={styles.dialogBody}>{editing.remove ? <p>Delete <strong>{editing.folder?.name}</strong>? This removes the empty folder, not your mail.</p> : <><label className={styles.field}>Folder name<input autoFocus required maxLength={64} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Customers" disabled={organizer.busy}/></label><p className={styles.helper}>Available to everyone with access to this mailbox.</p></>}{error && <p role="alert" className={styles.error}>{error}</p>}</div>
        <div className={styles.dialogFooter}><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={() => setEditing(null)}>Cancel</button><button type="submit" className={editing.remove ? styles.danger : styles.primary} disabled={organizer.busy}>{organizer.busy ? 'Saving...' : editing.remove ? 'Delete folder' : editing.folder ? 'Save name' : 'Create folder'}</button></div>
      </form>
    </MailModal>}
    {rulesOpen && <MailRulesDialog organizer={organizer} onClose={() => setRulesOpen(false)}/>}
  </div>;
}

export function MoveMailButton({ onClick, disabled = false, compact = false }: { onClick: () => void; disabled?: boolean; compact?: boolean }) {
  return <button type="button" className={compact ? styles.iconButton : styles.secondary} disabled={disabled} onClick={onClick} title="Move to folder" aria-label="Move to folder"><FolderInput size={16}/>{!compact && 'Move to...'}</button>;
}

export function MoveMailDialog({ message, organizer, onMoved, onClose }: { message: OrganizedMessage; organizer: MailOrganizer; onMoved: (message: OrganizedMessage) => void; onClose: () => void }) {
  const [destination, setDestination] = useState(message.custom_folder_id ?? 'default');
  const [error, setError] = useState<string | null>(null);
  const defaultName = message.direction === 'outbound' ? 'Sent' : 'Inbox';
  async function move() {
    setError(null);
    try {
      const result = await organizer.mutate({ action: 'moveMessage', id: message.id, folderId: destination === 'default' ? null : destination });
      if (!result.message) throw new Error('Unable to confirm the move. Refresh mail and try again.');
      onMoved(result.message); onClose();
    } catch (e) { setError(errorText(e)); }
  }
  return <MailModal title="Move message" busy={organizer.busy} onClose={onClose}>
    <form onSubmit={event => { event.preventDefault(); void move(); }}><div className={styles.dialogBody}>
      <p className={styles.messageSubject}>{message.subject || '(No subject)'}</p>
      <label className={styles.field}>Destination<select autoFocus value={destination} onChange={event => setDestination(event.target.value)} disabled={organizer.busy}><option value="default">{defaultName}</option>{organizer.folders.map(folder => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select></label>
      <p className={styles.helper}>Your read status and star are preserved. Create additional folders from the Mail sidebar.</p>{error && <p role="alert" className={styles.error}>{error}</p>}
    </div><div className={styles.dialogFooter}><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={onClose}>Cancel</button><button type="submit" className={styles.primary} disabled={organizer.busy || !organizer.canMove}>{organizer.busy ? 'Moving...' : 'Move message'}</button></div></form>
  </MailModal>;
}

type RuleForm = { name: string; enabled: boolean; priority: number; fromAddress: string; fromDomain: string; subjectContains: string; recipient: string; attachment: string; destination: string; markRead: boolean; star: boolean };
function formFor(rule?: MailRule): RuleForm {
  return { name: rule?.name ?? '', enabled: rule?.enabled ?? true, priority: rule?.priority ?? 100, fromAddress: rule?.conditions.fromAddress ?? '', fromDomain: rule?.conditions.fromDomain ?? '', subjectContains: rule?.conditions.subjectContains ?? '', recipient: rule?.conditions.recipient ?? '', attachment: rule?.conditions.hasAttachment === true ? 'yes' : rule?.conditions.hasAttachment === false ? 'no' : 'any', destination: rule?.actions.moveToFolderId ?? (rule?.actions.archive ? 'archive' : 'unchanged'), markRead: rule?.actions.markRead ?? false, star: rule?.actions.star ?? false };
}

function MailRulesDialog({ organizer, onClose }: { organizer: MailOrganizer; onClose: () => void }) {
  const [editing, setEditing] = useState<{ rule?: MailRule } | null>(null);
  const [removing, setRemoving] = useState<MailRule | null>(null);
  const [form, setForm] = useState<RuleForm>(() => formFor());
  const [error, setError] = useState<string | null>(null);
  function edit(rule?: MailRule) { setForm(formFor(rule)); setEditing({ rule }); setRemoving(null); setError(null); }
  async function saveRule() {
    setError(null);
    try {
      const rule = validateRule({ name: form.name, enabled: form.enabled, priority: form.priority,
        conditions: { ...(form.fromAddress.trim() ? { fromAddress: form.fromAddress } : {}), ...(form.fromDomain.trim() ? { fromDomain: form.fromDomain } : {}), ...(form.subjectContains.trim() ? { subjectContains: form.subjectContains } : {}), ...(form.recipient.trim() ? { recipient: form.recipient } : {}), ...(form.attachment === 'any' ? {} : { hasAttachment: form.attachment === 'yes' }) },
        actions: { ...(form.destination === 'archive' ? { archive: true } : form.destination === 'unchanged' ? {} : { moveToFolderId: form.destination }), ...(form.markRead ? { markRead: true } : {}), ...(form.star ? { star: true } : {}) } });
      await organizer.mutate({ action: editing?.rule ? 'updateRule' : 'createRule', id: editing?.rule?.id, rule });
      setEditing(null);
    } catch (e) { setError(errorText(e)); }
  }
  async function toggle(rule: MailRule) {
    setError(null);
    try { await organizer.mutate({ action: 'updateRule', id: rule.id, rule: { ...rule, enabled: !rule.enabled } }); } catch (e) { setError(errorText(e)); }
  }
  async function deleteRule() {
    if (!removing) return;
    setError(null);
    try { await organizer.mutate({ action: 'deleteRule', id: removing.id }); setRemoving(null); } catch (e) { setError(errorText(e)); }
  }
  return <MailModal title={removing ? 'Delete mail rule' : editing ? editing.rule ? 'Edit mail rule' : 'Create mail rule' : 'Mail rules'} busy={organizer.busy} onClose={onClose}>
    {removing ? <><div className={styles.dialogBody}><p>Delete <strong>{removing.name}</strong>? Previously organized mail stays where it is.</p>{error && <p role="alert" className={styles.error}>{error}</p>}</div><div className={styles.dialogFooter}><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={() => { setRemoving(null); setError(null); }}>Cancel</button><button type="button" className={styles.danger} disabled={organizer.busy} onClick={() => void deleteRule()}>{organizer.busy ? 'Deleting...' : 'Delete rule'}</button></div></> : editing ?
      <form onSubmit={event => { event.preventDefault(); void saveRule(); }}><div className={styles.dialogBody}>
        <fieldset disabled={organizer.busy}><div className={styles.grid}><label className={styles.field}>Rule name<input autoFocus required maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Customer quotations"/></label><label className={styles.field}>Priority<input type="number" required min={1} max={10000} step={1} value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })}/></label></div>
        <h3 className={styles.formHeading}>When a new message arrives</h3><p className={styles.helper}>All entered conditions must match. Leave conditions you do not need blank.</p>
        <div className={styles.grid}><label className={styles.field}>From address<input type="email" maxLength={255} value={form.fromAddress} onChange={e => setForm({ ...form, fromAddress: e.target.value })} placeholder="buyer@acme.com"/></label><label className={styles.field}>Sender domain<input maxLength={253} value={form.fromDomain} onChange={e => setForm({ ...form, fromDomain: e.target.value })} placeholder="acme.com"/></label><label className={styles.field}>Subject contains<input maxLength={255} value={form.subjectContains} onChange={e => setForm({ ...form, subjectContains: e.target.value })} placeholder="Quotation"/></label><label className={styles.field}>To or Cc address<input type="email" maxLength={255} value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} placeholder="sales@yourcompany.com"/></label></div>
        <label className={styles.field}>Attachments<select value={form.attachment} onChange={e => setForm({ ...form, attachment: e.target.value })}><option value="any">Any message</option><option value="yes">Has an attachment</option><option value="no">No attachments</option></select></label>
        <h3 className={styles.formHeading}>Then</h3><label className={styles.field}>Organize message<select value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })}><option value="unchanged">Keep in Inbox</option><option value="archive">Archive</option>{organizer.folders.map(folder => <option key={folder.id} value={folder.id}>Move to {folder.name}</option>)}</select></label>
        <div className={styles.checks}><label><input type="checkbox" checked={form.markRead} onChange={e => setForm({ ...form, markRead: e.target.checked })}/>Mark as read</label><label><input type="checkbox" checked={form.star} onChange={e => setForm({ ...form, star: e.target.checked })}/>Star</label><label><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })}/>Rule enabled</label></div>
        <p className={styles.helper}>Lower priority numbers run first. Only the first matching enabled rule runs. Existing mail is not changed.</p></fieldset>
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div><div className={styles.dialogFooter}><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={() => { setEditing(null); setError(null); }}>Cancel</button><button type="submit" className={styles.primary} disabled={organizer.busy || !organizer.canManage}>{organizer.busy ? 'Saving...' : 'Save rule'}</button></div></form> :
      <><div className={styles.dialogBody}><div className={styles.ruleIntro}><p>Rules organize <strong>new incoming mail</strong>. All conditions must match; the first matching enabled rule wins.</p>{organizer.canManage && <button type="button" className={styles.primary} disabled={organizer.busy} onClick={() => edit()}><Plus size={16}/>New rule</button>}</div>
        {error && <p role="alert" className={styles.error}>{error}</p>}{organizer.error && <p role="alert" className={styles.error}>{organizer.error}</p>}
        {!organizer.rules.length && <div className={styles.emptyState}><SlidersHorizontal size={28}/><h3>No rules yet</h3><p>Route customer emails, quotations, or supplier updates into the right folder automatically.</p></div>}
        <div className={styles.ruleList}>{organizer.rules.map(rule => { const summary = describeRule(rule, organizer.folders); return <div key={rule.id} className={styles.ruleCard}>
          <div className={styles.ruleHeader}><div><h3>{rule.name}</h3><p className={styles.helper}>Priority {rule.priority}</p></div><label className={styles.enable}><input type="checkbox" aria-label={`Enable ${rule.name}`} checked={rule.enabled} disabled={!organizer.canManage || organizer.busy} onChange={() => void toggle(rule)}/>{rule.enabled ? 'Enabled' : 'Paused'}</label></div>
          <p className={styles.ruleSummary}>{summary.conditions}</p><p className={styles.ruleAction}><ArrowRight size={15}/>{summary.actions}</p>{organizer.canManage && <div className={styles.ruleButtons}><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={() => edit(rule)}><Pencil size={14}/>Edit</button><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={() => { setRemoving(rule); setError(null); }}><Trash2 size={14}/>Delete</button></div>}
        </div>; })}</div><p className={styles.helper}>Rules apply to this shared mailbox, not just your view. Manual moves are preserved when delivery notifications are repeated.</p>
      </div><div className={styles.dialogFooter}><button type="button" className={styles.secondary} disabled={organizer.busy} onClick={onClose}>Done</button></div></>}
  </MailModal>;
}
