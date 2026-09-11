'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Archive, Download, FileText, Forward, Inbox, Mail, MailOpen, Paperclip, PenLine, RefreshCw, Reply, ReplyAll, Search, Send, Settings, ShieldAlert, Sparkles, Star, Trash2, Undo2, UserRoundCheck, X } from 'lucide-react';
import { createDraftSession, persistSignature, restoreDraft, type MailSignature } from '../lib/compose-state';
import { mergeById, organizerRequest, organizerUrl, type OrganizerResult, type OrganizedMessage as MailMessage, type MailAttachment as Attachment } from '../lib/organizer-client';
import { adjustMailCounts, countMailFolders, EMPTY_MAIL_COUNTS, persistMessageAction, runMailBatch, type MailCounts, type MailFolder as Folder, type MailAction } from '../lib/message-actions';
import { useMailOrganizer } from '../lib/use-mail-organizer';
import { MailFolderSidebar, MoveMailButton, MoveMailDialog } from './mail-organization-controls';
import { MailActionDialog, MailComposerPanel, MailSelectAll, MailSelectionActions, type ComposerFields, type ComposeCrmContext, type GuruPreview } from './mail-interaction-controls';
import organizationStyles from './mail-organization.module.css';
import styles from './mail-interactions.module.css';

type Mailbox = { id: string; address: string; display_name: string | null };
type MailPayload = { mailbox: Mailbox | null; messages: MailMessage[]; attachments: Attachment[]; signature: MailSignature | null; counts: MailCounts; providerReady: boolean; inboundReady: boolean };
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
type MailIntelligence = { messageId: string; peerAddress: string; crmMatch: null | { id: string; company_name: string | null; contact_name: string | null; href: string }; createCrmHref?: string | null; intents: Array<{ key: string; label: string; confidence: string; suggestedAction: string; evidence?: string; actionLabel?: string | null; actionHref?: string | null }> };
type Confirmation = { kind: 'move' | 'trash' | 'discard'; messages: MailMessage[] };
type Cursor = { beforeAt: string; beforeId: string } | null;
const EMPTY_FIELDS: ComposerFields = { to: '', cc: '', bcc: '', subject: '', body: '', html: '' };
function addresses(value: string) { return value.split(',').map(x => x.trim()).filter(Boolean); }
function errorText(error: unknown) { return error instanceof Error ? error.message : 'Unable to complete this mail action.'; }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : date.toLocaleDateString([], { month: 'short', day: 'numeric' }); }
function fileSize(value: number | null) { const n = Number(value ?? 0); return n < 1048576 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`; }
function htmlFromText(value: string) { const escaped = String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;'); return `<p>${escaped.replace(/\r?\n/g, '<br>')}</p>`; }
function folderMatches(message: MailMessage, folder: Folder) {
  if (folder === 'starred') return message.is_starred && message.folder !== 'trash';
  if (folder === 'junk') return message.folder === 'junk' || message.folder === 'spam';
  return message.folder === folder;
}

export function SetuMailWorkspace({ userName, userEmail, organizationName }: { userName: string; userEmail: string; organizationName: string }) {
  const [data, setData] = useState<MailPayload>({ mailbox: null, messages: [], attachments: [], signature: null, counts: { ...EMPTY_MAIL_COUNTS }, providerReady: false, inboundReady: false });
  const [folder, setFolder] = useState<Folder>('inbox');
  const [customFolderId, setCustomFolderId] = useState<string | null>(null);
  const organizer = useMailOrganizer(data.mailbox?.id ?? null, customFolderId);
  const [systemMessages, setSystemMessages] = useState<MailMessage[]>([]);
  const [systemCursor, setSystemCursor] = useState<Cursor>(null);
  const [systemLoading, setSystemLoading] = useState(false);
  const [systemError, setSystemError] = useState<string | null>(null);
  const systemRequestVersion = useRef(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<MailMessage | null>(null);
  const [detailAttachments, setDetailAttachments] = useState<Attachment[]>([]);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [moveTarget, setMoveTarget] = useState<MailMessage | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [fields, setFields] = useState<ComposerFields>({ ...EMPTY_FIELDS });
  const [includeSignature, setIncludeSignature] = useState(true);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [parentMessageId, setParentMessageId] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [composeBusy, setComposeBusy] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [signatureText, setSignatureText] = useState('');
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [savingSignature, setSavingSignature] = useState(false);
  const [intelligence, setIntelligence] = useState<MailIntelligence | null>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [composeCrmContext, setComposeCrmContext] = useState<ComposeCrmContext>(null);
  const [systemReloadNonce, setSystemReloadNonce] = useState(0);
  const [composeCrmLoading, setComposeCrmLoading] = useState(false);
  const [guruPreview, setGuruPreview] = useState<GuruPreview>(null);
  const [guruBusy, setGuruBusy] = useState(false);
  const [lastGuruAction, setLastGuruAction] = useState<string | null>(null);
  const mounted = useRef(true);
  const busy = useRef(false);
  const actionLock = useRef(false);
  const signatureLock = useRef(false);
  const refreshVersion = useRef(0);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSession = useRef<ReturnType<typeof createDraftSession> | null>(null);
  const savedDraft = useRef<MailMessage | null>(null);
  const lastSavedInput = useRef('');
  const currentInput = useRef('');
  const draftInput = { to: addresses(fields.to), cc: addresses(fields.cc), bcc: addresses(fields.bcc), subject: fields.subject, text: fields.body, html: fields.html, threadId, includeSignature };
  currentInput.current = JSON.stringify(draftInput);

  function stopAutosave() { if (autosaveTimer.current) clearTimeout(autosaveTimer.current); autosaveTimer.current = null; }
  async function refresh() {
    const version = ++refreshVersion.current;
    setLoading(true);
    try {
      const response = await fetch('/api/mail', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load mail.');
      if (mounted.current && version === refreshVersion.current) setData({ ...payload, counts: payload.counts ?? countMailFolders(payload.messages ?? []) });
    } catch (error) { if (mounted.current) setNotice(errorText(error)); }
    finally { if (mounted.current) setLoading(false); }
  }
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; stopAutosave(); ++refreshVersion.current; ++systemRequestVersion.current; }; }, []);

  useEffect(() => {
    if (!data.mailbox) { setSystemMessages([]); setSystemCursor(null); return; }
    if (customFolderId && !search.trim()) return;
    const version = ++systemRequestVersion.current;
    const timer = setTimeout(async () => {
      setSystemLoading(true); setSystemError(null);
      try {
        const params = new URLSearchParams({ mailboxId: data.mailbox!.id, limit: '50', folder: search.trim() ? 'all' : folder });
        if (search.trim()) params.set('q', search.trim());
        const response = await fetch(`/api/mail/search?${params}`, { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load messages.');
        if (mounted.current && version === systemRequestVersion.current) { setSystemMessages(payload.messages ?? []); setSystemCursor(payload.nextCursor ?? null); }
      } catch (error) { if (mounted.current && version === systemRequestVersion.current) setSystemError(errorText(error)); }
      finally { if (mounted.current && version === systemRequestVersion.current) setSystemLoading(false); }
    }, search.trim() ? 250 : 0);
    return () => clearTimeout(timer);
  }, [data.mailbox?.id, folder, customFolderId, search, systemReloadNonce]);

  async function loadOlderSystem() {
    if (!data.mailbox || !systemCursor || systemLoading) return;
    const version = systemRequestVersion.current;
    setSystemLoading(true); setSystemError(null);
    try {
      const params = new URLSearchParams({ mailboxId: data.mailbox.id, limit: '50', folder: search.trim() ? 'all' : folder, beforeAt: systemCursor.beforeAt, beforeId: systemCursor.beforeId });
      if (search.trim()) params.set('q', search.trim());
      const response = await fetch(`/api/mail/search?${params}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load older messages.');
      if (mounted.current && version === systemRequestVersion.current) { setSystemMessages(previous => mergeById(previous, payload.messages ?? [])); setSystemCursor(payload.nextCursor ?? null); }
    } catch (error) { setSystemError(errorText(error)); }
    finally { if (mounted.current && version === systemRequestVersion.current) setSystemLoading(false); }
  }

  function applyMessage(updated: MailMessage, fallback: MailMessage | null = null) {
    ++refreshVersion.current;
    setData(previous => {
      const before = previous.messages.find(m => m.id === updated.id) ?? fallback;
      return { ...previous, messages: mergeById(previous.messages, [updated]), counts: adjustMailCounts(previous.counts, before, updated) };
    });
    setSystemMessages(previous => previous.some(item => item.id === updated.id) ? previous.map(item => item.id === updated.id ? { ...item, ...updated } : item) : previous);
    setSelectedDetail(previous => previous?.id === updated.id ? { ...previous, ...updated } : previous);
    organizer.applyMessage(updated);
  }

  async function saveDraft(force = false): Promise<MailMessage | null> {
    if (!composeOpen) return savedDraft.current;
    const hasContent = [fields.to, fields.cc, fields.bcc, fields.subject, fields.body].some(value => value.trim());
    if (!force && !hasContent && !draftSession.current?.getId() && !draftSession.current?.hasPending()) return null;
    const session = draftSession.current ?? createDraftSession(draftId); draftSession.current = session;
    const key = JSON.stringify(draftInput); setSaveState('saving');
    try {
      const draft = await session.save(draftInput);
      if (mounted.current) {
        applyMessage(draft);
        if (draftSession.current === session) { savedDraft.current = draft; setDraftId(draft.id); lastSavedInput.current = key; setSaveState(currentInput.current === key ? 'saved' : 'dirty'); }
      }
      return draft;
    } catch (error) { if (mounted.current && draftSession.current === session) setSaveState('error'); throw error; }
  }
  useEffect(() => {
    stopAutosave();
    if (!composeOpen || composeBusy || actionBusy) return;
    if (currentInput.current === lastSavedInput.current) { setSaveState('saved'); return; }
    if (![fields.to, fields.cc, fields.bcc, fields.subject, fields.body].some(v => v.trim()) && !draftSession.current?.getId() && !draftSession.current?.hasPending()) { setSaveState('idle'); return; }
    setSaveState('dirty'); autosaveTimer.current = setTimeout(() => { void saveDraft().catch(() => undefined); }, 1000); return stopAutosave;
  }, [composeOpen, composeBusy, actionBusy, fields, threadId, includeSignature]);
  useEffect(() => {
    if (!composeOpen || (saveState !== 'dirty' && saveState !== 'saving' && saveState !== 'error')) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [composeOpen, saveState]);

  const filtered = useMemo(() => {
    if (customFolderId && !search.trim()) return organizer.page?.messages ?? [];
    return search.trim() ? systemMessages : systemMessages.filter(message => folderMatches(message, folder));
  }, [systemMessages, organizer.page, customFolderId, folder, search]);
  const selected = filtered.find(m => m.id === selectedId) ?? null;
  const readerMessage = selectedDetail?.id === selected?.id ? selectedDetail : selected;
  const checkedMessages = filtered.filter(m => checkedIds.includes(m.id));
  const selectedAttachments = selectedDetail?.id === selected?.id ? detailAttachments : (customFolderId ? organizer.page?.attachments ?? [] : data.attachments).filter(a => a.message_id === selected?.id);
  const folderTitle = search.trim() ? 'Search results' : customFolderId ? organizer.folders.find(f => f.id === customFolderId)?.name ?? organizer.page?.folder.name ?? 'Folder' : folder === 'junk' ? 'Junk' : folder;
  const actionsDisabled = actionBusy || Boolean(composeBusy) || organizer.busy || !organizer.canMove;
  useEffect(() => { setCheckedIds([]); }, [folder, customFolderId, search]);

  useEffect(() => {
    setSelectedDetail(null); setDetailAttachments([]); setIntelligence(null);
    if (!selected || !data.mailbox) { setIntelligenceLoading(false); return; }
    let active = true;
    fetch(`/api/mail/messages/${selected.id}?mailboxId=${encodeURIComponent(data.mailbox.id)}`, { cache: 'no-store' }).then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to load message.'); if (active) { setSelectedDetail(payload.message); setDetailAttachments(payload.attachments ?? []); } }).catch(error => { if (active) setNotice(errorText(error)); });
    if (selected.status !== 'draft') {
      setIntelligenceLoading(true);
      fetch(`/api/mail/intelligence/${selected.id}`, { cache: 'no-store' }).then(async response => { const payload = await response.json(); if (!response.ok) throw new Error(); if (active) setIntelligence(payload); }).catch(() => { if (active) setIntelligence(null); }).finally(() => { if (active) setIntelligenceLoading(false); });
    }
    return () => { active = false; };
  }, [selected?.id, data.mailbox?.id]);

  useEffect(() => {
    if (!composeOpen) { setComposeCrmContext(null); setComposeCrmLoading(false); return; }
    const peer = addresses(fields.to)[0]?.toLowerCase() ?? '';
    if (!peer || !peer.includes('@')) { setComposeCrmContext(null); setComposeCrmLoading(false); return; }
    let active = true; const timer = setTimeout(async () => {
      setComposeCrmLoading(true);
      try {
        const response = await fetch(`/api/mail/compose/context?email=${encodeURIComponent(peer)}`, { cache: 'no-store' }); const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Unable to load CRM context.');
        if (active) setComposeCrmContext(payload.crmMatch ? payload.crmMatch : payload.createCrmHref ? { createCrmHref: payload.createCrmHref } : null);
      } catch { if (active) setComposeCrmContext(null); }
      finally { if (active) setComposeCrmLoading(false); }
    }, 350);
    return () => { active = false; clearTimeout(timer); };
  }, [composeOpen, fields.to]);

  function resetCompose() {
    stopAutosave(); draftSession.current = null; savedDraft.current = null; lastSavedInput.current = ''; currentInput.current = '';
    setComposeOpen(false); setComposeExpanded(false); setComposeMinimized(false); setFields({ ...EMPTY_FIELDS }); setIncludeSignature(true);
    setDraftId(null); setParentMessageId(null); setThreadId(null); setPendingAttachments([]); setSaveState('idle'); setGuruPreview(null); setLastGuruAction(null); setComposeCrmContext(null);
  }
  function openCompose() { if (busy.current || actionLock.current) return; if (composeOpen) { setComposeMinimized(false); return; } resetCompose(); draftSession.current = createDraftSession(); setComposeOpen(true); }
  async function closeCompose(): Promise<boolean> {
    if (busy.current || actionLock.current) return false; busy.current = true; setComposeBusy('Saving...'); stopAutosave();
    try { await saveDraft(); resetCompose(); return true; } catch (error) { setNotice(errorText(error)); return false; } finally { busy.current = false; setComposeBusy(null); }
  }
  async function openDraft(message: MailMessage) {
    if (busy.current || actionLock.current || !data.mailbox) return;
    if (composeOpen && draftSession.current?.getId() === message.id) { setComposeMinimized(false); return; }
    if (composeOpen && !await closeCompose()) return;
    busy.current = true; setComposeBusy('Loading draft...'); setNotice(null);
    try {
      const response = await fetch(`/api/mail/messages/${encodeURIComponent(message.id)}?mailboxId=${encodeURIComponent(data.mailbox.id)}`, { cache: 'no-store' }); const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load the saved draft.');
      const draft: MailMessage = payload.message;
      if (!draft || draft.id !== message.id || draft.status !== 'draft' || draft.folder !== 'drafts') throw new Error('This draft was sent or moved. Refresh mail before editing.');
      const attachments: Attachment[] = payload.attachments ?? []; const restored = restoreDraft(draft, attachments); const html = restored.html || htmlFromText(restored.body);
      resetCompose(); draftSession.current = createDraftSession(draft.id); savedDraft.current = draft;
      lastSavedInput.current = JSON.stringify({ to: addresses(restored.to), cc: addresses(restored.cc), bcc: addresses(restored.bcc), subject: restored.subject, text: restored.body, html, threadId: restored.threadId, includeSignature: restored.includeSignature });
      setFields({ to: restored.to, cc: restored.cc, bcc: restored.bcc, subject: restored.subject, body: restored.body, html }); setIncludeSignature(restored.includeSignature);
      setDraftId(draft.id); setThreadId(restored.threadId); setPendingAttachments(restored.attachments); setSaveState('saved'); setComposeOpen(true); applyMessage(draft, message);
      setData(previous => ({ ...previous, attachments: [...previous.attachments.filter(a => a.message_id !== draft.id), ...attachments] }));
    } catch (error) { setNotice(errorText(error)); } finally { busy.current = false; setComposeBusy(null); }
  }
  async function selectMessage(message: MailMessage) { if (message.status === 'draft' && message.folder === 'drafts') { await openDraft(message); return; } setSelectedId(message.id); if (!message.is_read && organizer.canMove) await messageAction('read', message, true); }

  async function beginReply(message: MailMessage, replyAll = false) {
    if (message.status === 'draft' || busy.current || actionLock.current) return;
    if (composeOpen && !await closeCompose()) return;
    const own = data.mailbox?.address.toLowerCase() ?? '';
    const primary = message.direction === 'inbound' ? [message.from_address] : message.to_addresses;
    const toList = Array.from(new Set(primary.map(v => v.toLowerCase()).filter(v => v && v !== own)));
    const ccList = replyAll ? Array.from(new Set([...(message.direction === 'inbound' ? message.to_addresses : []), ...(message.cc_addresses ?? [])].map(v => v.toLowerCase()).filter(v => v && v !== own && !toList.includes(v)))) : [];
    resetCompose(); draftSession.current = createDraftSession(); setComposeOpen(true);
    setFields({ ...EMPTY_FIELDS, to: toList.join(', '), cc: ccList.join(', '), subject: /^re:/i.test(message.subject) ? message.subject : `Re: ${message.subject}` });
    setThreadId(message.thread_id); setParentMessageId(message.id);
  }
  async function forward(message: MailMessage) {
    if (composeOpen && !await closeCompose()) return;
    const body = `\n\n---------- Forwarded message ----------\nFrom: ${message.from_address}\nDate: ${new Date(message.created_at).toLocaleString()}\nSubject: ${message.subject}\nTo: ${(message.to_addresses ?? []).join(', ')}\n\n${message.text_body ?? ''}`.trim();
    resetCompose(); draftSession.current = createDraftSession(); setComposeOpen(true); setFields({ ...EMPTY_FIELDS, subject: /^fwd:/i.test(message.subject) ? message.subject : `Fwd: ${message.subject}`, body, html: htmlFromText(body) });
  }

  async function send() {
    if (busy.current || actionLock.current || !data.mailbox) return; busy.current = true; setComposeBusy('Sending...'); stopAutosave();
    try {
      const draft = await saveDraft();
      const response = await fetch('/api/mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mailboxId: data.mailbox.id, ...draftInput, draftId: draft?.id ?? null, parentMessageId, attachmentIds: pendingAttachments.map(a => a.id) }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Unable to send email.');
      if (draft) setData(previous => ({ ...previous, messages: previous.messages.filter(m => m.id !== draft.id), counts: adjustMailCounts(previous.counts, previous.messages.find(m => m.id === draft.id) ?? draft, null) }));
      resetCompose(); selectFolder('sent'); setNotice('Email sent.'); await refresh();
    } catch (error) { setNotice(errorText(error)); } finally { busy.current = false; setComposeBusy(null); }
  }

  async function requestGuru(action: string) {
    if (guruBusy) return; setGuruBusy(true); setLastGuruAction(action); setNotice(null);
    try {
      const response = await fetch('/api/mail/compose/guru', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, to: addresses(fields.to), subject: fields.subject, text: fields.body, parentMessageId }) });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Setu Guru could not prepare a preview.');
      setGuruPreview({ suggestion: payload.suggestion, action });
    } catch (error) { setNotice(errorText(error)); } finally { setGuruBusy(false); }
  }
  function insertGuru() {
    if (!guruPreview) return;
    if (guruPreview.action === 'suggest_subject') setFields(previous => ({ ...previous, subject: guruPreview.suggestion }));
    else setFields(previous => ({ ...previous, body: guruPreview.suggestion, html: htmlFromText(guruPreview.suggestion) }));
    setGuruPreview(null); setNotice('Setu Guru preview inserted. Review it before sending.');
  }

  async function executeBatch(messages: MailMessage[], action: MailAction | 'move', value: boolean, target: string | null = null) {
    if (!data.mailbox || actionLock.current || busy.current || organizer.busy || !organizer.canMove) throw new Error('Another mail action is in progress, or this mailbox is read-only.');
    actionLock.current = true; setActionBusy(true); ++refreshVersion.current; const activeDraft = draftSession.current?.getId();
    try {
      if (action === 'trash' && value && activeDraft && messages.some(m => m.id === activeDraft)) { stopAutosave(); setComposeBusy('Saving...'); const latest = await saveDraft(); if (latest) messages = messages.map(m => m.id === latest.id ? latest : m); }
      const result = await runMailBatch(messages, async message => {
        if (action !== 'move') return persistMessageAction(data.mailbox!.id, message, action, value);
        const moved = await organizerRequest<OrganizerResult>(organizerUrl(data.mailbox!.id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'moveMessage', id: message.id, folderId: target }) });
        if (!moved.ok || !moved.message || moved.message.id !== message.id) throw new Error('Unable to confirm the move.');
        return moved.message;
      }, (before, after) => { applyMessage(after, before); if (after.folder === 'trash' && after.id === activeDraft) resetCompose(); });
      if (action === 'move' || action === 'trash' || action === 'archive') { setCheckedIds(previous => previous.filter(id => !result.succeeded.includes(id))); setSelectedId(previous => previous && result.succeeded.includes(previous) ? null : previous); }
      await organizer.reload(); if (result.failed.length) setNotice(`${result.succeeded.length} updated; ${result.failed.length} failed. ${result.failed[0].error}`); else if (messages.length > 1) setNotice(`${result.succeeded.length} messages updated.`); return result;
    } finally { actionLock.current = false; setActionBusy(false); setComposeBusy(null); }
  }
  async function messageAction(action: MailAction, message = selected, value?: boolean) { if (!message) return; try { await executeBatch([message], action, value ?? (action === 'star' ? !message.is_starred : action === 'read' ? !message.is_read : true)); } catch (error) { setNotice(errorText(error)); } }

  async function junkAction(messages: MailMessage[], junk: boolean, senderPolicy: 'trusted' | 'blocked' | null = null) {
    if (!data.mailbox || actionBusy || !organizer.canMove) return;
    setActionBusy(true);
    try {
      const response = await fetch(`/api/mail/junk?mailboxId=${encodeURIComponent(data.mailbox.id)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds: messages.map(m => m.id), junk, senderPolicy }) });
      const payload = await response.json(); if (!response.ok && !(payload.messages?.length)) throw new Error(payload.error || payload.failures?.[0]?.error || 'Unable to change Junk status.');
      for (const updated of payload.messages ?? []) applyMessage(updated, messages.find(m => m.id === updated.id) ?? null);
      setCheckedIds([]); setSelectedId(null); await refresh(); await organizer.reload();
      const verb = junk ? 'Moved to Junk.' : 'Restored to Inbox.'; const policy = senderPolicy === 'blocked' ? ' Sender blocked.' : senderPolicy === 'trusted' ? ' Sender trusted.' : '';
      setNotice(`${verb}${policy}${payload.failures?.length ? ` ${payload.failures.length} failed.` : ''}`);
    } catch (error) { setNotice(errorText(error)); } finally { setActionBusy(false); }
  }

  async function discardDraft(): Promise<string | null> {
    if (!data.mailbox || busy.current || actionLock.current) return 'Another mail action is in progress.'; busy.current = true; setComposeBusy('Saving...'); stopAutosave();
    try { const draft = await saveDraft(); if (draft) { const updated = await persistMessageAction(data.mailbox.id, draft, 'trash', true); applyMessage(updated, draft); } resetCompose(); setNotice('Draft deleted. It can be restored from Trash.'); await organizer.reload(); return null; }
    catch (error) { return errorText(error); } finally { busy.current = false; setComposeBusy(null); }
  }
  async function confirmAction(target: string | null): Promise<string | null> {
    if (!confirmation) return null; if (confirmation.kind === 'discard') return discardDraft();
    const result = await executeBatch(confirmation.messages, confirmation.kind === 'move' ? 'move' : 'trash', true, target);
    if (!result.failed.length) return null; setConfirmation(previous => previous ? { ...previous, messages: previous.messages.filter(m => result.failed.some(f => f.id === m.id)) } : null); return `${result.failed.length} message(s) could not be updated. ${result.failed[0].error} Retry will apply only to the failed messages.`;
  }

  async function upload(file: File) {
    if (busy.current || actionLock.current) return; busy.current = true; setComposeBusy('Attaching file...'); stopAutosave();
    try {
      const draft = await saveDraft(true); if (!draft) throw new Error('Save the draft before attaching a file.');
      const form = new FormData(); form.set('file', file); form.set('messageId', draft.id); if (data.mailbox) form.set('mailboxId', data.mailbox.id);
      const response = await fetch('/api/mail/attachments', { method: 'POST', body: form }); const payload = await response.json(); if (!response.ok || !payload.attachment) throw new Error(payload.error || 'Unable to attach file.');
      const attachment: Attachment = payload.attachment; ++refreshVersion.current; setPendingAttachments(previous => mergeById(previous, [attachment])); setData(previous => ({ ...previous, attachments: mergeById(previous.attachments, [attachment]) })); setNotice(`${attachment.filename} attached.`);
    } catch (error) { setNotice(`Attachment failed: ${errorText(error)}`); } finally { busy.current = false; setComposeBusy(null); }
  }
  async function removeAttachment(id: string) {
    if (composeBusy) return; setComposeBusy('Removing attachment...');
    try {
      const response = await fetch('/api/mail/attachments', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to remove attachment.'); setPendingAttachments(previous => previous.filter(a => a.id !== id)); setData(previous => ({ ...previous, attachments: previous.attachments.filter(a => a.id !== id) }));
    } catch (error) { setNotice(`Attachment removal failed: ${errorText(error)}`); } finally { setComposeBusy(null); }
  }
  async function downloadAttachment(id: string) {
    try { const response = await fetch(`/api/mail/attachments?id=${encodeURIComponent(id)}`, { headers: { Accept: 'application/json' } }); const payload = await response.json(); if (!response.ok || !payload.url) throw new Error(payload.error || 'Unable to download attachment.'); window.open(payload.url, '_blank', 'noopener,noreferrer'); }
    catch (error) { setNotice(`Attachment download failed: ${errorText(error)}`); }
  }
  async function saveSignature() {
    if (signatureLock.current) return; signatureLock.current = true; setSavingSignature(true); setSignatureError(null);
    try { const signature = await persistSignature(signatureText); ++refreshVersion.current; setData(previous => ({ ...previous, signature })); setSignatureOpen(false); setNotice('Signature saved.'); }
    catch (error) { setSignatureError(errorText(error)); } finally { signatureLock.current = false; setSavingSignature(false); }
  }
  function selectFolder(key: Folder) { setCustomFolderId(null); setFolder(key); setSelectedId(null); setSelectedDetail(null); setSearch(''); setCheckedIds([]); }
  const folders: [Folder, string, typeof Inbox][] = [['inbox', 'Inbox', Inbox], ['sent', 'Sent', Send], ['drafts', 'Drafts', FileText], ['starred', 'Starred', Star], ['archive', 'Archive', Archive], ['junk', 'Junk', ShieldAlert], ['trash', 'Trash', Trash2]];
  const saveLabel = saveState === 'saving' ? 'Saving draft...' : saveState === 'saved' ? 'Draft saved' : saveState === 'error' ? 'Draft not saved' : saveState === 'dirty' ? 'Unsaved changes' : 'New message';
  const selectedCanJunk = checkedMessages.length > 0 && checkedMessages.every(m => m.direction === 'inbound' && m.status !== 'draft' && m.folder !== 'trash');

  return <div className="h-[calc(100vh-7.5rem)] min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex h-full">
    <aside className="w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50/70 p-4">
      <button onClick={openCompose} disabled={loading || !data.mailbox || actionBusy} className={`${styles.button} ${styles.primary} mb-5 w-full`}><PenLine size={17}/>Compose</button>
      <div className="space-y-1">{folders.map(([key, label, Icon]) => { const count = data.counts[key] ?? 0; return <button key={key} onClick={() => selectFolder(key)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${!customFolderId && folder === key ? 'bg-blue-50 font-semibold text-blue-700' : 'text-slate-600 hover:bg-white'}`}><Icon className="h-4 w-4"/>{label}{count > 0 && <span className="ml-auto text-xs tabular-nums" aria-label={`${count} ${key === 'drafts' || key === 'starred' ? 'messages' : 'unread messages'}`}>{count}</span>}</button>; })}</div>
      {data.mailbox && <MailFolderSidebar organizer={organizer} activeId={customFolderId} onSelect={id => { setCustomFolderId(id); setSelectedId(null); setSearch(''); setCheckedIds([]); }} onDeleted={id => { if (customFolderId === id) selectFolder('inbox'); }}/>}<div className="mt-6 border-t border-slate-200 pt-4"><p className="truncate text-xs font-semibold text-slate-700">{data.mailbox?.address ?? userEmail}</p><p className="mt-1 text-[11px] text-slate-400">{organizationName}</p><button onClick={() => { setSignatureText(data.signature?.text_signature ?? ''); setSignatureError(null); setSignatureOpen(true); }} className="mt-3 flex items-center gap-2 text-xs font-medium text-slate-500"><Settings size={15}/>Signature</button></div>
    </aside>
    <section className="flex w-[350px] shrink-0 flex-col border-r border-slate-200" aria-label="Mail message list">
      <div className="shrink-0 border-b border-slate-200 p-4"><div className="flex items-center justify-between"><div className="min-w-0"><h2 className="truncate font-semibold capitalize text-slate-900">{folderTitle}</h2><p className="text-xs text-slate-400">{customFolderId && !search.trim() && organizer.page ? `${organizer.page.messages.length} of ${organizer.page.total} messages loaded` : `${filtered.length} message${filtered.length === 1 ? '' : 's'} loaded${search.trim() ? ' · entire mailbox' : ''}`}</p></div><button disabled={actionBusy || Boolean(composeBusy)} onClick={() => { void refresh(); void organizer.reload(); void organizer.reloadFolder(); setSystemReloadNonce(value => value + 1); }} title="Refresh mail" aria-label="Refresh mail" className={styles.iconButton}><RefreshCw size={16} className={loading || organizer.pageLoading || systemLoading ? 'animate-spin' : ''}/></button></div><div className="mt-3 flex items-center gap-2 rounded-lg border border-slate-200 px-3"><Search size={16}/><input aria-label="Search mailbox" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search entire mailbox" className="min-w-0 flex-1 py-2 text-sm outline-none"/></div></div>
      <div className={styles.toolbar}><MailSelectAll checked={filtered.length > 0 && checkedMessages.length === filtered.length} mixed={checkedMessages.length > 0 && checkedMessages.length < filtered.length} disabled={actionsDisabled || !filtered.length} onChange={() => setCheckedIds(checkedMessages.length === filtered.length ? [] : filtered.map(m => m.id))}/><span>{checkedMessages.length ? `${checkedMessages.length} selected` : 'Select messages'}</span></div>
      {checkedMessages.length > 0 && <MailSelectionActions count={checkedMessages.length} disabled={actionsDisabled} hasDrafts={checkedMessages.some(m => m.status === 'draft')} junkMode={folder === 'junk'} canJunk={selectedCanJunk} onAction={(action, value) => { void executeBatch(checkedMessages, action, value).catch(e => setNotice(errorText(e))); }} onMove={() => setConfirmation({ kind: 'move', messages: checkedMessages })} onDelete={() => setConfirmation({ kind: 'trash', messages: checkedMessages })} onJunk={junk => void junkAction(checkedMessages, junk)} onClear={() => setCheckedIds([])}/>} 
      <div className="min-h-0 flex-1 overflow-y-auto">{customFolderId && !search.trim() && organizer.pageError && <div role="alert" className="p-4 text-sm text-rose-700">{organizer.pageError}<button onClick={() => void organizer.reloadFolder()}>Retry</button></div>}{systemError && (!customFolderId || search.trim()) && <div role="alert" className="p-4 text-sm text-rose-700">{systemError}</div>}
        {filtered.map(message => <div key={message.id} data-selected={selectedId === message.id} className={`${organizationStyles.messageRow} flex items-center border-b border-slate-100`}>
          <label className={styles.rowSelect}><input type="checkbox" className={styles.checkbox} checked={checkedIds.includes(message.id)} disabled={actionsDisabled} aria-label={`Select message: ${message.subject || 'No subject'}`} onChange={() => setCheckedIds(previous => previous.includes(message.id) ? previous.filter(id => id !== message.id) : [...previous, message.id])}/></label>
          <button type="button" data-mail-message-id={message.id} disabled={Boolean(composeBusy)} onClick={() => void selectMessage(message)} className="min-w-0 flex-1 px-3 py-4 text-left"><div className="flex items-center justify-between gap-2"><p className={`truncate text-sm ${message.is_read ? 'text-slate-700' : 'font-semibold text-slate-900'}`}>{message.direction === 'inbound' ? message.from_address : message.to_addresses.join(', ') || 'No recipient'}</p><span className="shrink-0 text-[11px] text-slate-400">{formatTime(message.draft_saved_at || message.created_at)}</span></div><p className={`mt-1 truncate text-sm ${message.is_read ? 'text-slate-600' : 'font-semibold text-slate-800'}`}>{message.status === 'draft' && <span className="mr-2 text-xs font-semibold">Draft</span>}{message.subject || '(No subject)'}</p><p className="mt-1 truncate text-xs text-slate-400">{message.text_body || 'No preview'}</p></button>
          <div className={styles.rowActions}><button className={`${styles.iconButton} ${message.is_starred ? styles.selectedStar : ''}`} disabled={actionsDisabled} title={message.is_starred ? 'Remove star' : 'Star message'} aria-label={message.is_starred ? 'Remove star' : 'Star message'} aria-pressed={message.is_starred} onClick={() => void messageAction('star', message)}><Star size={15} fill={message.is_starred ? 'currentColor' : 'none'}/></button>{message.status !== 'draft' ? <MoveMailButton compact disabled={actionsDisabled} onClick={() => setMoveTarget(message)}/> : message.folder === 'drafts' ? <button className={`${styles.iconButton} ${styles.danger}`} disabled={actionsDisabled} title="Delete draft" aria-label="Delete saved draft" onClick={() => setConfirmation({ kind: 'trash', messages: [message] })}><Trash2 size={15}/></button> : null}</div>
        </div>)}
        {!filtered.length && !(customFolderId && !search.trim() ? organizer.pageLoading : systemLoading) && <p className="p-5 text-sm text-slate-500">{search ? 'No messages matched your mailbox search.' : 'No messages in this folder.'}</p>}
        {customFolderId && !search.trim() && organizer.page && organizer.page.nextOffset !== null && <button disabled={organizer.pageLoading} className="w-full p-4 text-sm font-semibold text-blue-700" onClick={() => void organizer.loadMore()}>{organizer.pageLoading ? 'Loading...' : 'Load more messages'}</button>}
        {(!customFolderId || search.trim()) && systemCursor && <button disabled={systemLoading} className="w-full p-4 text-sm font-semibold text-blue-700" onClick={() => void loadOlderSystem()}>{systemLoading ? 'Loading...' : 'Load older messages'}</button>}
      </div>
    </section>
    <main className="min-w-0 flex-1 overflow-y-auto" aria-label="Message reader">{selected && readerMessage ? <><div className="border-b border-slate-200 px-6 py-4"><h1 className="break-words text-lg font-semibold text-slate-900">{readerMessage.subject || '(No subject)'}</h1><p className="mt-2 break-all text-sm text-slate-700">{readerMessage.from_address}</p><p className="mt-1 break-all text-xs text-slate-500">To: {readerMessage.to_addresses.join(', ')}{readerMessage.cc_addresses?.length ? ` · Cc: ${readerMessage.cc_addresses.join(', ')}` : ''}</p><p className="mt-1 text-xs capitalize text-slate-500">{new Date(readerMessage.created_at).toLocaleString()} · {readerMessage.status}</p>
      <div className="mt-4 flex flex-wrap gap-2">{readerMessage.status !== 'draft' && <><button className={styles.button} disabled={Boolean(composeBusy)} onClick={() => void beginReply(readerMessage)}><Reply size={16}/>Reply</button><button className={styles.button} disabled={Boolean(composeBusy)} onClick={() => void beginReply(readerMessage, true)}><ReplyAll size={16}/>Reply all</button><button className={styles.button} disabled={Boolean(composeBusy)} onClick={() => void forward(readerMessage)}><Forward size={16}/>Forward</button></>}
        <button className={styles.button} disabled={actionsDisabled} onClick={() => void messageAction('read')} title={readerMessage.is_read ? 'Mark as unread' : 'Mark as read'}>{readerMessage.is_read ? <Mail size={16}/> : <MailOpen size={16}/>}Mark {readerMessage.is_read ? 'unread' : 'read'}</button>
        <button className={`${styles.iconButton} ${readerMessage.is_starred ? styles.selectedStar : ''}`} disabled={actionsDisabled} title={readerMessage.is_starred ? 'Remove star' : 'Star message'} aria-label={readerMessage.is_starred ? 'Remove star' : 'Star message'} aria-pressed={readerMessage.is_starred} onClick={() => void messageAction('star')}><Star size={16} fill={readerMessage.is_starred ? 'currentColor' : 'none'}/></button>
        {readerMessage.status !== 'draft' && <><button className={styles.iconButton} disabled={actionsDisabled} title={readerMessage.folder === 'archive' ? 'Unarchive message' : 'Archive message'} aria-label={readerMessage.folder === 'archive' ? 'Unarchive message' : 'Archive message'} onClick={() => void messageAction('archive', readerMessage, readerMessage.folder !== 'archive')}><Archive size={16}/></button><MoveMailButton disabled={actionsDisabled} onClick={() => setMoveTarget(readerMessage)}/></>}
        {readerMessage.direction === 'inbound' && readerMessage.status !== 'draft' && readerMessage.folder !== 'trash' && ((readerMessage.folder === 'junk' || readerMessage.folder === 'spam') ? <><button className={styles.button} disabled={actionsDisabled} onClick={() => void junkAction([readerMessage], false)}><UserRoundCheck size={16}/>Not junk</button>{organizer.canManage && <button className={styles.button} disabled={actionsDisabled} onClick={() => void junkAction([readerMessage], false, 'trusted')}><UserRoundCheck size={16}/>Not junk + trust sender</button>}</> : <><button className={styles.button} disabled={actionsDisabled} onClick={() => void junkAction([readerMessage], true)}><ShieldAlert size={16}/>Junk</button>{organizer.canManage && <button className={styles.button} disabled={actionsDisabled} onClick={() => void junkAction([readerMessage], true, 'blocked')}><ShieldAlert size={16}/>Junk + block sender</button>}</>)}
        {readerMessage.folder === 'trash' ? <button className={styles.button} disabled={actionsDisabled} onClick={() => void messageAction('trash', readerMessage, false)}><Undo2 size={16}/>Restore</button> : <button className={`${styles.button} ${styles.danger}`} disabled={actionsDisabled} onClick={() => setConfirmation({ kind: 'trash', messages: [readerMessage] })}><Trash2 size={16}/>Delete</button>}
      </div></div>
      <div className="p-6">{selectedDetail?.id === selected.id && selectedDetail.html_body ? <div className="mail-rich-reader break-words text-sm leading-7 text-slate-700" dangerouslySetInnerHTML={{ __html: selectedDetail.html_body }}/>: <div className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{readerMessage.text_body || 'No message body.'}</div>}
        {selectedAttachments.length > 0 && <div className="mt-6 flex flex-wrap gap-2">{selectedAttachments.map(a => <button key={a.id} onClick={() => void downloadAttachment(a.id)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs"><Paperclip size={15}/>{a.filename}<span>{fileSize(a.size_bytes)}</span><Download size={14}/></button>)}</div>}
        {readerMessage.status !== 'draft' && <div className="mt-8 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5"><div className="flex items-center gap-2"><Sparkles size={16}/><h3 className="font-semibold">Setu Guru</h3></div>{intelligenceLoading ? <p className="mt-3 text-sm text-slate-500">Understanding this conversation...</p> : intelligence ? <div className="mt-4 space-y-4"><div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs font-semibold text-slate-500">CRM connection</p>{intelligence.crmMatch ? <><p className="mt-2 text-sm font-semibold">{intelligence.crmMatch.company_name || intelligence.crmMatch.contact_name || intelligence.peerAddress}</p><a className="mt-2 inline-block text-sm text-blue-700" href={intelligence.crmMatch.href}>Open lead</a></> : <><p className="mt-2 text-sm text-slate-600">No CRM record matches {intelligence.peerAddress}.</p>{intelligence.createCrmHref && <a className="mt-2 inline-block text-sm text-blue-700" href={intelligence.createCrmHref}>Create lead</a>}</>}</div>{intelligence.intents.map(intent => <div key={intent.key} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-sm font-semibold">{intent.label}</p><p className="mt-1 text-xs text-slate-500">{intent.suggestedAction}</p>{intent.evidence && <p className="mt-2 text-xs italic text-slate-500">{intent.evidence}</p>}{intent.actionHref && intent.actionLabel && <a className="mt-2 inline-block text-sm text-blue-700" href={intent.actionHref}>{intent.actionLabel}</a>}</div>)}{!intelligence.intents.length && <p className="text-sm text-slate-500">No specific action detected. Review the message for next steps.</p>}<p className="text-xs text-slate-500">Guru suggests actions. You stay in control of every CRM change.</p></div> : <p className="mt-3 text-sm text-slate-500">Guru analysis is unavailable for this message.</p>}</div>}
      </div></> : <div className="flex h-full items-center justify-center text-center"><div><Mail className="mx-auto h-10 w-10 text-slate-300"/><p className="mt-3 text-sm font-medium text-slate-600">Select a message</p><p className="mt-1 text-xs text-slate-400">Read, reply and act on business conversations.</p></div></div>}</main>
  </div>
    {moveTarget && <MoveMailDialog key={moveTarget.id} message={moveTarget} organizer={organizer} onClose={() => setMoveTarget(null)} onMoved={message => { applyMessage(message, moveTarget); setSelectedId(null); setCheckedIds(previous => previous.filter(id => id !== message.id)); setNotice('Message moved.'); }}/>} 
    {confirmation && <MailActionDialog kind={confirmation.kind} count={confirmation.kind === 'discard' ? 1 : confirmation.messages.length} folders={organizer.folders} busy={actionBusy || Boolean(composeBusy)} onConfirm={confirmAction} onClose={() => setConfirmation(null)}/>} 
    {notice && <div role="status" className="fixed bottom-6 right-6 z-[600] flex max-w-lg items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-xl"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss notification"><X size={17}/></button></div>}
    {signatureOpen && <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/30 p-4"><div role="dialog" aria-modal="true" aria-label="Email signature" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><h3 className="text-lg font-semibold">Email signature</h3><p className="mt-1 text-sm text-slate-500">Previewed in Compose and included once when enabled.</p><textarea aria-label="Signature text" value={signatureText} onChange={e => setSignatureText(e.target.value)} disabled={savingSignature} rows={7} maxLength={10000} className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm"/>{signatureText && <div className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">{signatureText}</div>}{signatureError && <p role="alert" className={styles.error}>{signatureError}</p>}<div className="mt-4 flex justify-end gap-2"><button className={styles.button} disabled={savingSignature} onClick={() => setSignatureOpen(false)}>Cancel</button><button className={`${styles.button} ${styles.primary}`} disabled={savingSignature} onClick={() => void saveSignature()}>{savingSignature ? 'Saving...' : 'Save signature'}</button></div></div></div>}
    {composeOpen && <MailComposerPanel fields={fields} from={data.mailbox?.address ?? userEmail} draftId={draftId} expanded={composeExpanded} minimized={composeMinimized} disabled={Boolean(composeBusy) || actionBusy} busyLabel={composeBusy} saveLabel={saveLabel} saveError={saveState === 'error'} signatureOn={Boolean(data.signature?.text_signature || data.signature?.html_signature)} signatureText={data.signature?.text_signature ?? ''} includeSignature={includeSignature} attachments={pendingAttachments} crmContext={composeCrmContext} crmLoading={composeCrmLoading} guruPreview={guruPreview} guruBusy={guruBusy} onField={(key, value) => setFields(previous => ({ ...previous, [key]: value }))} onEditor={(html, text) => setFields(previous => ({ ...previous, html, body: text }))} onSignatureToggle={setIncludeSignature} onExpand={() => { setComposeExpanded(v => !v); setComposeMinimized(false); }} onMinimize={() => setComposeMinimized(v => !v)} onClose={() => void closeCompose()} onSend={() => void send()} onUpload={file => void upload(file)} onRemoveAttachment={id => void removeAttachment(id)} onDelete={() => setConfirmation({ kind: 'discard', messages: [] })} onRetry={() => { void saveDraft().catch(e => setNotice(errorText(e))); }} onGuru={action => void requestGuru(action)} onGuruInsert={insertGuru} onGuruRegenerate={() => { if (lastGuruAction) void requestGuru(lastGuruAction); }}/>} 
  </div>;
}
