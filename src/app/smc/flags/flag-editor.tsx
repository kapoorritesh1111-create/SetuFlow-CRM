'use client';

import { useState } from 'react';
import { createFlag, updateFlag } from './actions';

type Flag = {
  id: string; flag_key: string; name: string; description: string | null;
  enabled: boolean; rollout_percentage: number;
};

export function FlagEditor({ flags }: { flags: Flag[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="ha"><button className="smc-btn smc-btn-p" onClick={() => setOpen((v) => !v)}>+ New Flag</button></div>
      {open && (
        <div className="smc-content-card" style={{ marginBottom: 16 }}>
          <form action={createFlag} style={{ display: 'grid', gap: 8 }}>
            <input name="flag_key" placeholder="flag_key (e.g. team_chat)" required className="smc-input" />
            <input name="name" placeholder="Display name" className="smc-input" />
            <input name="description" placeholder="Description" className="smc-input" />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="checkbox" name="enabled" /> Enabled
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              Rollout %<input type="number" name="rollout_percentage" min={0} max={100} defaultValue={0} className="smc-input" style={{ width: 90 }} />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" className="smc-btn smc-btn-p">Create</button>
              <button type="button" className="smc-btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}
      <div className="smc-content-grid">
        {flags.map((f) => (
          <div key={f.id} className="smc-content-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4>{f.name}</h4>
              <span className={`smc-st ${f.enabled ? 'resolved' : 'deferred'}`}>{f.enabled ? 'ON' : 'OFF'}</span>
            </div>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#64748b' }}>{f.flag_key}</p>
            {f.description && <p>{f.description}</p>}
            <form action={updateFlag} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input type="hidden" name="flag_key" value={f.flag_key} />
              <input type="hidden" name="enabled" value={f.enabled ? '' : 'on'} />
              <input type="number" name="rollout_percentage" defaultValue={f.rollout_percentage} min={0} max={100} className="smc-input" style={{ width: 80 }} />
              <button type="submit" className="smc-btn" style={{ fontSize: 11 }}>{f.enabled ? 'Disable' : 'Enable'} / Save</button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
