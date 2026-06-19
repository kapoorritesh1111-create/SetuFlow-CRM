'use client';

import { useState } from 'react';
import { createEntry } from './actions';

export function ChangelogForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ha"><button className="smc-btn smc-btn-p" onClick={() => setOpen((v) => !v)}>+ New Entry</button></div>
      {open && (
        <div className="smc-content-card" style={{ marginBottom: 16 }}>
          <form action={createEntry} style={{ display: 'grid', gap: 8 }}>
            <input name="title" placeholder="Release title" required className="smc-input" />
            <div style={{ display: 'flex', gap: 8 }}>
              <input name="version" placeholder="Version (optional)" className="smc-input" style={{ flex: 1 }} />
              <input name="sprint_number" type="number" placeholder="Sprint #" className="smc-input" style={{ width: 110 }} />
            </div>
            <textarea name="content" placeholder="What shipped" required className="smc-input" rows={3} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" name="is_client_facing" /> Publish as client-facing release note
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="smc-btn smc-btn-p">Create</button>
              <button type="button" className="smc-btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
