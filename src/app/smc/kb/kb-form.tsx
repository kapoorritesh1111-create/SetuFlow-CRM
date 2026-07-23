'use client';

import { useState } from 'react';
import { createArticle } from './actions';

export function KbForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ha"><button className="smc-btn smc-btn-p" onClick={() => setOpen((v) => !v)}>+ New Article</button></div>
      {open && (
        <div className="smc-content-card" style={{ marginBottom: 16 }}>
          <form action={createArticle} style={{ display: 'grid', gap: 8 }}>
            <input name="title" placeholder="Article title" required className="smc-input" />
            <div style={{ display: 'flex', gap: 8 }}>
              <input name="category" placeholder="Category (e.g. Quotes, Orders, Getting Started)" className="smc-input" style={{ flex: 1 }} />
            </div>
            <input name="summary" placeholder="One-line summary shown in the list (optional)" className="smc-input" />
            <textarea name="body" placeholder="Article body — plain text, blank line between paragraphs" required className="smc-input" rows={8} />
            <p style={{ fontSize: 12, color: '#64748b' }}>
              New articles start as Draft. Move to Review, then Publish from the list below when it&apos;s ready for customers.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="smc-btn smc-btn-p">Create draft</button>
              <button type="button" className="smc-btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
