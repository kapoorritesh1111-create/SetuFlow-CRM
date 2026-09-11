'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { appendFolderPage, organizerRequest, organizerUrl, updateFolderMessage, type FolderPage, type OrganizedMessage, type OrganizerResult, type OrganizerSnapshot } from './organizer-client';

export function useMailOrganizer(mailboxId: string | null, activeFolderId: string | null) {
  const [snapshot, setSnapshot] = useState<OrganizerSnapshot | null>(null);
  const [pageState, setPageState] = useState<{ mailboxId: string; page: FolderPage } | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const identity = useRef({ mailboxId, activeFolderId });
  identity.current = { mailboxId, activeFolderId };
  const mounted = useRef(true);
  const organizationVersion = useRef(0);
  const pageVersion = useRef(0);
  const mutation = useRef(false);
  const moreBusy = useRef(false);
  const pageRef = useRef(pageState);
  pageRef.current = pageState;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; ++organizationVersion.current; ++pageVersion.current; }; }, []);

  const reload = useCallback(async () => {
    const version = ++organizationVersion.current;
    if (!mailboxId) { setSnapshot(null); setLoading(false); setError(null); return; }
    setLoading(true); setError(null);
    try {
      const result = await organizerRequest<OrganizerSnapshot>(organizerUrl(mailboxId));
      if (result.mailboxId !== mailboxId) throw new Error('Mailbox changed. Refresh mail and try again.');
      if (mounted.current && version === organizationVersion.current && identity.current.mailboxId === mailboxId) setSnapshot(result);
    } catch (e) {
      if (mounted.current && version === organizationVersion.current) {
        setSnapshot(null); setError(e instanceof Error ? e.message : 'Unable to load folders and rules.');
      }
    } finally { if (mounted.current && version === organizationVersion.current) setLoading(false); }
  }, [mailboxId]);

  const reloadFolder = useCallback(async () => {
    const version = ++pageVersion.current;
    moreBusy.current = false;
    if (!mailboxId || !activeFolderId) { setPageState(null); setPageLoading(false); setPageError(null); return; }
    setPageLoading(true); setPageError(null);
    try {
      const page = await organizerRequest<FolderPage>(organizerUrl(mailboxId, activeFolderId));
      if (page.folder.id !== activeFolderId) throw new Error('Folder changed. Please try again.');
      if (mounted.current && version === pageVersion.current && identity.current.mailboxId === mailboxId && identity.current.activeFolderId === activeFolderId) setPageState({ mailboxId, page });
    } catch (e) {
      if (mounted.current && version === pageVersion.current) setPageError(e instanceof Error ? e.message : 'Unable to load this folder.');
    } finally { if (mounted.current && version === pageVersion.current) setPageLoading(false); }
  }, [mailboxId, activeFolderId]);

  useEffect(() => { void reload(); return () => { ++organizationVersion.current; }; }, [reload]);
  useEffect(() => { void reloadFolder(); return () => { ++pageVersion.current; }; }, [reloadFolder]);

  async function loadMore() {
    const current = pageRef.current;
    if (!mailboxId || !activeFolderId || !current || current.mailboxId !== mailboxId || current.page.folder.id !== activeFolderId || current.page.nextOffset === null || moreBusy.current || pageLoading) return;
    moreBusy.current = true;
    const version = pageVersion.current;
    setPageLoading(true); setPageError(null);
    try {
      const next = await organizerRequest<FolderPage>(organizerUrl(mailboxId, activeFolderId, current.page.nextOffset));
      if (mounted.current && version === pageVersion.current && identity.current.mailboxId === mailboxId && identity.current.activeFolderId === activeFolderId) {
        setPageState(previous => ({ mailboxId, page: appendFolderPage(previous?.page ?? null, next) }));
      }
    } catch (e) {
      if (mounted.current && version === pageVersion.current) setPageError(e instanceof Error ? e.message : 'Unable to load more messages.');
    } finally {
      if (mounted.current && version === pageVersion.current) { moreBusy.current = false; setPageLoading(false); }
    }
  }

  async function mutate(payload: Record<string, unknown>): Promise<OrganizerResult> {
    if (!mailboxId) throw new Error('Choose a mailbox first.');
    if (mutation.current) throw new Error('Another mail change is being saved. Please try again.');
    mutation.current = true; setBusy(true);
    try {
      const result = await organizerRequest<OrganizerResult>(organizerUrl(mailboxId), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!result.ok) throw new Error('Unable to confirm the mail change.');
      if (mounted.current && identity.current.mailboxId === mailboxId) {
        if (result.message) applyMessage(result.message);
        // A successful write is not reported as failed just because the subsequent count refresh fails.
        await reload();
      }
      return result;
    } finally { mutation.current = false; if (mounted.current) setBusy(false); }
  }

  function applyMessage(message: OrganizedMessage) {
    // Invalidate a stale folder page before applying a user's explicit move/read/star action.
    if (identity.current.mailboxId !== mailboxId) return;
    if (identity.current.activeFolderId === activeFolderId) { ++pageVersion.current; moreBusy.current = false; setPageLoading(false); }
    setPageState(previous => previous?.mailboxId === mailboxId ? { ...previous, page: updateFolderMessage(previous.page, message) } : previous);
  }

  const scoped = snapshot?.mailboxId === mailboxId ? snapshot : null;
  const page = pageState?.mailboxId === mailboxId && pageState.page.folder.id === activeFolderId ? pageState.page : null;
  return { folders: scoped?.folders ?? [], rules: scoped?.rules ?? [], canManage: scoped?.canManage === true, canMove: scoped?.canMove === true,
    page, loading, pageLoading, busy, error, pageError, reload, reloadFolder, loadMore, mutate, applyMessage };
}
export type MailOrganizer = ReturnType<typeof useMailOrganizer>;
