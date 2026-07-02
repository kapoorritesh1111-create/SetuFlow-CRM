'use client';

import { useState } from 'react';

type SmcMember = {
  id: string; user_id: string; display_name: string; initials: string;
  email: string | null; role: string; allowed_groups: string[] | null;
  can_manage_leads: boolean; can_manage_clients: boolean;
  can_manage_access: boolean; can_view_revenue: boolean;
  can_view_delivery: boolean; is_active: boolean;
};

const ROLES = [
  { key: 'owner', label: 'Owner', desc: 'Full access including access management. Only for founders.', color: '#1F487C' },
  { key: 'lead', label: 'Lead', desc: 'Full access except managing who can access SMC.', color: '#279491' },
  { key: 'member', label: 'Member', desc: 'Can work in assigned nav groups and manage leads.', color: '#6366f1' },
  { key: 'viewer', label: 'Viewer', desc: 'Read-only access to assigned nav groups.', color: '#94a3b8' },
];

const NAV_GROUPS = [
  { key: 'overview',  label: 'Overview',      desc: 'Dashboard, Health' },
  { key: 'delivery',  label: 'Delivery',       desc: 'Issues, Board, QA, Incidents, Deployments' },
  { key: 'growth',    label: 'Growth',         desc: 'Leads, Clients, Revenue, Roadmap' },
  { key: 'intel',     label: 'Intelligence',   desc: 'Wiki, Guests, Guru, SEO' },
  { key: 'config',    label: 'Config',         desc: 'Feature Flags, Demo' },
];

const PERMISSIONS = [
  { key: 'can_manage_leads',   label: 'Manage Leads',   desc: 'Create, edit, delete internal CRM leads and log activity' },
  { key: 'can_manage_clients', label: 'Manage Clients', desc: 'Enable/disable modules, manage client orgs, provision trials' },
  { key: 'can_view_revenue',   label: 'View Revenue',   desc: 'See MRR, billing status, and commercial metrics' },
  { key: 'can_view_delivery',  label: 'View Delivery',  desc: 'Access issues, board, QA, incidents, deployments' },
  { key: 'can_manage_access',  label: 'Manage Access',  desc: 'Add/remove team members and change SMC permissions (Owner only)' },
];

function roleBadge(role: string) {
  const r = ROLES.find(x => x.key === role);
  return <span style={{ background: `${r?.color ?? '#94a3b8'}18`, color: r?.color ?? '#94a3b8', border: `1px solid ${r?.color ?? '#94a3b8'}33`, borderRadius: 8, padding: '2px 9px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.06em' }}>{r?.label ?? role}</span>;
}

function MemberForm({ member, onDone, saveMember }: {
  member: SmcMember | null;
  onDone: () => void;
  saveMember: (fd: FormData) => Promise<void>;
}) {
  const isNew = !member;
  const [groups, setGroups] = useState<string[]>(member?.allowed_groups ?? []);
  const allGroups = groups.length === 0;

  function toggleGroup(key: string) {
    setGroups(prev => prev.includes(key) ? prev.filter(g => g !== key) : [...prev, key]);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onDone}>
      <div style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 560, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 32px 80px rgba(15,23,42,.22)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: '#279491', textTransform: 'uppercase' }}>SMC Access</p>
          <h3 style={{ margin: '4px 0 0', fontSize: 18, fontWeight: 700, color: '#0f172a' }}>{isNew ? 'Add Team Member' : `Edit — ${member.display_name}`}</h3>
        </div>

        <form action={async (fd) => { if (!allGroups) fd.set('allowed_groups', groups.join(',')); await saveMember(fd); onDone(); }} style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {member && <input type="hidden" name="id" value={member.id} />}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
              Auth User ID (UUID) *
              <input name="user_id" required defaultValue={member?.user_id ?? ''} placeholder="180afa12-..." style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #dbe6ef', borderRadius: 10, padding: '8px 10px', fontSize: 12, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
              Display Name *
              <input name="display_name" required defaultValue={member?.display_name ?? ''} placeholder="Jane Smith" style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #dbe6ef', borderRadius: 10, padding: '8px 10px', fontSize: 12, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
              Initials (2–3 chars)
              <input name="initials" defaultValue={member?.initials ?? ''} maxLength={3} placeholder="JS" style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #dbe6ef', borderRadius: 10, padding: '8px 10px', fontSize: 12, boxSizing: 'border-box' }} />
            </label>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
              Email
              <input name="email" type="email" defaultValue={member?.email ?? ''} placeholder="jane@setugroups.com" style={{ display: 'block', width: '100%', marginTop: 4, border: '1px solid #dbe6ef', borderRadius: 10, padding: '8px 10px', fontSize: 12, boxSizing: 'border-box' }} />
            </label>
          </div>

          {/* Role */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#475569' }}>Role</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {ROLES.map(r => (
                <label key={r.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', cursor: 'pointer' }}>
                  <input type="radio" name="role" value={r.key} defaultChecked={member ? member.role === r.key : r.key === 'member'} style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: r.color }}>{r.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Nav groups */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>Nav Group Access</p>
              <button type="button" onClick={() => setGroups([])} style={{ fontSize: 10, fontWeight: 700, color: '#279491', background: 'none', border: 'none', cursor: 'pointer' }}>
                {allGroups ? '✓ All groups' : 'Reset to All'}
              </button>
            </div>
            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#94a3b8' }}>Leave all unchecked = all nav groups visible. Check specific groups to restrict.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {NAV_GROUPS.map(g => {
                const checked = groups.includes(g.key);
                return (
                  <button key={g.key} type="button" onClick={() => toggleGroup(g.key)}
                    style={{ border: `2px solid ${checked ? '#1F487C' : '#e2e8f0'}`, background: checked ? '#eef4ff' : '#fff', color: checked ? '#1F487C' : '#64748b', borderRadius: 10, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    title={g.desc}
                  >
                    {checked ? '✓ ' : ''}{g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#475569' }}>Feature Permissions</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {PERMISSIONS.map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', cursor: 'pointer' }}>
                  <input type="checkbox" name={p.key} defaultChecked={member ? (member as any)[p.key] : false} style={{ marginTop: 2 }} />
                  <div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{p.label}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 10, color: '#64748b' }}>{p.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Active */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, color: '#475569' }}>
            <input type="checkbox" name="is_active" defaultChecked={member?.is_active !== false} />
            Active (unchecked = suspended from SMC access)
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onDone} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button type="submit" style={{ background: '#1F487C', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              {isNew ? 'Add Member' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AccessBoard({ members, notice, saveMember, deactivateMember }: {
  members: SmcMember[];
  notice: string | null;
  saveMember: (fd: FormData) => Promise<void>;
  deactivateMember: (fd: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState<SmcMember | null | 'new'>(null);
  const active = members.filter(m => m.is_active);
  const inactive = members.filter(m => !m.is_active);

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Settings</div>
          <h1>Team Access</h1>
        </div>
        <div className="ha">
          <button onClick={() => setEditing('new')} style={{ background: '#1F487C', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Add Member</button>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notice === 'saved' && (
          <div style={{ background: '#ecfdf5', border: '1px solid #bbf7d0', color: '#047857', borderRadius: 12, padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>✓ Changes saved</div>
        )}
        {notice === 'deactivated' && (
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', borderRadius: 12, padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>Member suspended. They can no longer access SMC.</div>
        )}

        {/* How access works */}
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 16, padding: '14px 16px' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: '#0369a1', textTransform: 'uppercase' }}>How SMC Access Works</p>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 11, color: '#0c4a6e', lineHeight: 1.7 }}>
            <li>New hires: add them to <code>organization_members</code> for the internal org, then add them here with their role and nav groups.</li>
            <li><strong>Nav groups</strong> control which sidebar sections they see. Leave blank = all groups.</li>
            <li><strong>Feature permissions</strong> control what actions they can perform inside SMC.</li>
            <li>Owners can manage access. Leads can manage leads and clients. Members get assigned sections only.</li>
          </ul>
        </div>

        {/* Active members */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Active Members ({active.length})</h3>
          </div>
          {active.map((m, i) => (
            <div key={m.id} style={{ padding: '14px 18px', borderBottom: i < active.length - 1 ? '1px solid #f1f5f9' : 'none', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: 12, background: m.role === 'owner' ? '#1F487C' : m.role === 'lead' ? '#279491' : m.role === 'member' ? '#6366f1' : '#94a3b8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {m.initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{m.display_name}</span>
                  {roleBadge(m.role)}
                  {m.email && <span style={{ fontSize: 11, color: '#94a3b8' }}>{m.email}</span>}
                </div>
                {/* Nav groups */}
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {m.allowed_groups && m.allowed_groups.length > 0 ? (
                    m.allowed_groups.map(g => <span key={g} style={{ background: '#f1f5f9', color: '#475569', borderRadius: 6, padding: '2px 7px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{g}</span>)
                  ) : (
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>All nav groups</span>
                  )}
                </div>
                {/* Permissions */}
                <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {PERMISSIONS.filter(p => (m as any)[p.key]).map(p => (
                    <span key={p.key} style={{ background: '#ecfdf5', color: '#059669', borderRadius: 6, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>✓ {p.label}</span>
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => setEditing(m)} style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                {m.role !== 'owner' && (
                  <form action={deactivateMember} style={{ display: 'inline' }}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="user_id" value={m.user_id} />
                    <button type="submit" style={{ background: '#fff5f5', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      onClick={e => { if (!confirm(`Suspend ${m.display_name} from SMC?`)) e.preventDefault(); }}>
                      Suspend
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Inactive */}
        {inactive.length > 0 && (
          <div style={{ background: '#fafafa', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Suspended ({inactive.length})</h3>
            </div>
            {inactive.map(m => (
              <div key={m.id} style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 12, opacity: 0.55 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e2e8f0', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{m.initials}</div>
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>{m.display_name}</span>
                <button onClick={() => setEditing(m)} style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>Reactivate</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing !== null && (
        <MemberForm
          member={editing === 'new' ? null : editing}
          onDone={() => setEditing(null)}
          saveMember={saveMember}
        />
      )}
    </>
  );
}
