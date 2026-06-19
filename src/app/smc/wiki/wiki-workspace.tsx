'use client';

import { useState } from 'react';
import { DocsSharing } from './docs-sharing';

type Tab = 'docs' | 'share';

export function WikiWorkspace({ docsLinks, viewCounts }: { docsLinks: any[]; viewCounts: Record<string, number> }) {
  const [tab, setTab] = useState<Tab>('docs');
  const now = Date.now();
  const activeShare = docsLinks.filter((l) => !l.revoked_at && !(l.expires_at && new Date(l.expires_at).getTime() < now)).length;

  const tabBtn = (k: Tab, label: string, n?: number) => (
    <div onClick={() => setTab(k)} style={{ padding: '11px 14px', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', color: tab === k ? '#1f487c' : '#64748b', borderBottom: `2px solid ${tab === k ? '#279491' : 'transparent'}` }}>{label}{n != null ? ` (${n})` : ''}</div>
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', padding: '0 4px', flexShrink: 0 }}>
        {tabBtn('docs', 'Documentation')}{tabBtn('share', 'Share links', activeShare)}
      </div>
      {tab === 'docs' && <div style={{ flex: 1, overflow: 'hidden' }}><iframe src="/internal/setuflow-docs.html?in=smc" style={{ width: '100%', height: '100%', border: 'none' }} title="Documentation Hub" /></div>}
      {tab === 'share' && <div style={{ flex: 1, overflow: 'auto', padding: '14px 0' }}><DocsSharing links={docsLinks} viewCounts={viewCounts} /></div>}
    </div>
  );
}
