'use client';

import { useState } from 'react';
import { createRunbook } from './actions';

export function RunbookForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ha"><button className="smc-btn smc-btn-p" onClick={() => setOpen((v) => !v)}>+ New Runbook</button></div>
      {open && (
        <div className="smc-content-card" style={{ marginBottom: 16 }}>
          <form action={createRunbook} style={{ display: 'grid', gap: 8 }}>
            <input name="title" placeholder="Runbook title" required className="smc-input" />
            <input name="category" placeholder="Category (e.g. runbook, decision, onboarding)" className="smc-input" />
            <textarea name="content" placeholder="Markdown content (# headings, **bold**, - lists)" required className="smc-input" rows={8} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" name="pinned" /> Pin to top
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="smc-btn smc-btn-p">Save</button>
              <button type="button" className="smc-btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
