'use client';

import { useState } from 'react';
import { createIncident } from './actions';

export function IncidentForm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ha"><button className="smc-btn smc-btn-p" onClick={() => setOpen((v) => !v)}>+ Report Incident</button></div>
      {open && (
        <div className="smc-content-card" style={{ marginBottom: 16 }}>
          <form action={createIncident} style={{ display: 'grid', gap: 8 }}>
            <input name="title" placeholder="Incident title" required className="smc-input" />
            <select name="severity" className="smc-input" defaultValue="P2">
              <option value="P0">P0 — system down</option>
              <option value="P1">P1 — major</option>
              <option value="P2">P2 — moderate</option>
              <option value="P3">P3 — minor</option>
            </select>
            <textarea name="description" placeholder="What happened?" className="smc-input" rows={3} />
            <input name="impact_summary" placeholder="Impact summary" className="smc-input" />
            <input name="commander_name" placeholder="Incident commander" className="smc-input" />
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="smc-btn smc-btn-p">Open Incident</button>
              <button type="button" className="smc-btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
