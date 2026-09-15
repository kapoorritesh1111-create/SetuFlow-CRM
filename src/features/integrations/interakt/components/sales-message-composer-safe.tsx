'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { SalesMessageComposer as BaseSalesMessageComposer } from './sales-message-composer';

type BrochureOption = { id: string; name: string; description?: string | null; family_names?: string[]; family_slugs?: string[]; category_names?: string[] };
type Props = { rowId: string; customerName: string; companyName?: string | null; packagingType?: string | null; pouchType?: string | null; quantityText?: string | null; replyWindowOpen: boolean; canSend: boolean; brochures?: BrochureOption[] };
type Signature = { fullName: string; phoneNumber: string; emailAddress: string; organizationName: string };

export function SalesMessageComposer(props: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [signature, setSignature] = useState<Signature | null>(null);
  const [signatureHost, setSignatureHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let active = true;
    void fetch('/api/profile/signature', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active) return;
        const next = payload?.signature;
        if (next?.fullName && next?.organizationName) setSignature(next as Signature);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [props.rowId]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const syncHost = () => {
      const textarea = root.querySelector<HTMLTextAreaElement>('textarea[name="message"]');
      const anchor = textarea?.closest('label') ?? root.querySelector<HTMLElement>('form');
      if (!anchor) {
        setSignatureHost(root);
        return;
      }
      let host = root.querySelector<HTMLElement>('[data-setu-signature-preview-host="true"]');
      if (!host) {
        host = document.createElement('div');
        host.dataset.setuSignaturePreviewHost = 'true';
        anchor.insertAdjacentElement('afterend', host);
      }
      setSignatureHost(host);
    };

    syncHost();
    const observer = new MutationObserver(syncHost);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [props.replyWindowOpen, props.rowId]);

  const preview = signature ? (
    <div className="mt-2 rounded-card border border-info-border bg-info-bg px-3 py-2.5 text-small text-content-secondary">
      <p className="text-caption font-black uppercase tracking-[0.12em] text-content-brand">Signature included when sent</p>
      <div className="mt-1 space-y-0.5 leading-5">
        <p className="font-bold text-content-primary">{signature.fullName}</p>
        {signature.phoneNumber ? <p>Phone: {signature.phoneNumber}</p> : null}
        {signature.emailAddress ? <p>Email: {signature.emailAddress}</p> : null}
        <p>{signature.organizationName}</p>
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef}>
      <BaseSalesMessageComposer {...props} />
      {signatureHost && preview ? createPortal(preview, signatureHost) : null}
      {!signatureHost && preview ? preview : null}
    </div>
  );
}
