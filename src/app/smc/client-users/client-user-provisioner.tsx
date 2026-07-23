'use client';

import { useMemo, useState } from 'react';

export type ClientOrgOption = {
  id: string;
  name: string;
  slug: string | null;
  activeUsers: number;
  maxUsers: number;
};

export type RoleOption = {
  id: string;
  name: string;
  description: string | null;
  organizationId: string | null;
};

type UserRow = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  roleName: string;
};

type ResultRow = {
  email: string;
  status: 'created' | 'failed';
  message: string;
  user_id?: string;
  membership_id?: string;
};

function newRow(index: number): UserRow {
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
    fullName: '',
    username: '',
    email: '',
    roleName: '',
  };
}

function generatePassword() {
  const bytes = new Uint32Array(4);
  crypto.getRandomValues(bytes);
  return `Setu!${Array.from(bytes).map((value) => value.toString(36)).join('A')}9z`;
}

const fieldStyle = {
  width: '100%',
  minHeight: 40,
  border: '1px solid #dbe4ef',
  borderRadius: 10,
  padding: '8px 10px',
  fontSize: 12,
  background: '#fff',
  color: '#0f172a',
} as const;

const cardStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 18,
  background: '#fff',
  boxShadow: '0 16px 44px rgba(15, 23, 42, 0.05)',
} as const;

function canonicalRoleOptions(roles: RoleOption[], organizationId: string) {
  const roleNames = new Map<string, RoleOption>();

  for (const role of roles.filter((item) => item.organizationId === organizationId)) {
    roleNames.set(role.name.toLowerCase(), role);
  }
  for (const role of roles.filter((item) => item.organizationId === null)) {
    if (!roleNames.has(role.name.toLowerCase())) roleNames.set(role.name.toLowerCase(), role);
  }

  return Array.from(roleNames.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function ClientUserProvisioner({
  organizations,
  roles,
  operatorName,
}: {
  organizations: ClientOrgOption[];
  roles: RoleOption[];
  operatorName: string;
}) {
  const [organizationId, setOrganizationId] = useState(organizations[0]?.id ?? '');
  const [rows, setRows] = useState<UserRow[]>([newRow(0)]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [message, setMessage] = useState('');

  const selectedOrganization = organizations.find((org) => org.id === organizationId) ?? null;
  const roleOptions = useMemo(() => canonicalRoleOptions(roles, organizationId), [roles, organizationId]);
  const remainingSeats = selectedOrganization?.maxUsers
    ? Math.max(0, selectedOrganization.maxUsers - selectedOrganization.activeUsers)
    : null;

  function updateRow(id: string, patch: Partial<UserRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (rows.length >= 25) return;
    setRows((current) => [...current, newRow(current.length)]);
  }

  function removeRow(id: string) {
    setRows((current) => current.length === 1 ? current : current.filter((row) => row.id !== id));
  }

  function clearCompleted() {
    setRows([newRow(0)]);
    setPassword('');
    setResults([]);
    setMessage('');
  }

  async function provision() {
    setMessage('');
    setResults([]);

    const activeRows = rows
      .map((row) => ({
        full_name: row.fullName.trim(),
        username: row.username.trim(),
        email: row.email.trim().toLowerCase(),
        role_name: row.roleName,
      }))
      .filter((row) => row.full_name || row.username || row.email || row.role_name);

    if (!organizationId) return setMessage('Choose a client organization.');
    if (!password || password.length < 12) return setMessage('Temporary password must be at least 12 characters.');
    if (!activeRows.length) return setMessage('Add at least one user.');
    if (activeRows.some((row) => !row.full_name || !row.username || !row.email || !row.role_name)) {
      return setMessage('Every row needs full name, username, email, and role.');
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/smc/client-users/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId, password, users: activeRows }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(json.error ?? 'Unable to create users.');
        return;
      }
      setResults(json.results ?? []);
      setMessage(json.summary ?? 'Provisioning completed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#279491', textTransform: 'uppercase', letterSpacing: '.12em' }}>SMC internal only</div>
          <h1 style={{ margin: '6px 0 0', fontSize: 25, color: '#0f172a' }}>Client User Setup</h1>
          <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 13, maxWidth: 720 }}>
            Create multiple confirmed Supabase users, profiles, memberships, and role assignments for a client organization. Access is currently restricted to Ritesh only.
          </p>
        </div>
        <div style={{ ...cardStyle, padding: '11px 14px', minWidth: 230 }}>
          <span style={{ display: 'block', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em' }}>Authorized operator</span>
          <strong style={{ display: 'block', marginTop: 4, fontSize: 13 }}>{operatorName}</strong>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18, display: 'grid', gridTemplateColumns: '1.3fr .7fr', gap: 16 }}>
        <label style={{ fontSize: 11, color: '#475569' }}>
          Client organization
          <select value={organizationId} onChange={(event) => { setOrganizationId(event.target.value); setResults([]); setMessage(''); }} style={{ ...fieldStyle, marginTop: 6 }}>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>{org.name}{org.slug ? ` — ${org.slug}` : ''}</option>
            ))}
          </select>
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ border: '1px solid #eef2f7', borderRadius: 14, padding: 12, background: '#f8fafc' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Active users</span>
            <strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>{selectedOrganization?.activeUsers ?? 0}</strong>
          </div>
          <div style={{ border: '1px solid #eef2f7', borderRadius: 14, padding: 12, background: '#f8fafc' }}>
            <span style={{ fontSize: 10, color: '#64748b' }}>Available seats</span>
            <strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>{remainingSeats === null ? 'No cap' : remainingSeats}</strong>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15 }}>Users to create</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11 }}>Maximum 25 users per batch. Existing Auth users are skipped for safety.</p>
          </div>
          <button type="button" onClick={addRow} disabled={rows.length >= 25} className="smc-btn primary">+ Add user</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Full name', 'Username', 'Email', 'Role', ''].map((heading) => (
                  <th key={heading} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', borderBottom: '1px solid #e2e8f0' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}><input value={row.fullName} onChange={(event) => updateRow(row.id, { fullName: event.target.value })} placeholder="Full name" style={fieldStyle} /></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}><input value={row.username} onChange={(event) => updateRow(row.id, { username: event.target.value })} placeholder="username" style={fieldStyle} /></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}><input type="email" value={row.email} onChange={(event) => updateRow(row.id, { email: event.target.value })} placeholder="user@company.com" style={fieldStyle} /></td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}>
                    <select value={row.roleName} onChange={(event) => updateRow(row.id, { roleName: event.target.value })} style={fieldStyle}>
                      <option value="">Choose role</option>
                      {roleOptions.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}><button type="button" className="smc-btn" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'end' }}>
        <label style={{ fontSize: 11, color: '#475569' }}>
          Temporary password for this batch
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 12 characters" style={fieldStyle} />
            <button type="button" className="smc-btn" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            <button type="button" className="smc-btn" onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}>Generate</button>
          </div>
          <span style={{ display: 'block', marginTop: 6, fontSize: 10, color: '#94a3b8' }}>The password is sent only to the server for account creation and is never written to audit logs.</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="smc-btn" onClick={clearCompleted}>Clear</button>
          <button type="button" className="smc-btn primary" onClick={provision} disabled={submitting}>{submitting ? 'Creating users...' : `Create ${rows.length} user${rows.length === 1 ? '' : 's'}`}</button>
        </div>
      </div>

      {message ? <div style={{ border: `1px solid ${results.some((item) => item.status === 'failed') ? '#fecaca' : '#bbf7d0'}`, background: results.some((item) => item.status === 'failed') ? '#fef2f2' : '#ecfdf5', color: results.some((item) => item.status === 'failed') ? '#b91c1c' : '#047857', borderRadius: 14, padding: 13, fontSize: 12 }}>{message}</div> : null}

      {results.length ? (
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ padding: 15, borderBottom: '1px solid #e2e8f0' }}><h2 style={{ margin: 0, fontSize: 14 }}>Provisioning results</h2></div>
          {results.map((result) => (
            <div key={`${result.email}-${result.status}`} style={{ padding: '11px 15px', display: 'grid', gridTemplateColumns: '1fr 100px 1.5fr', gap: 12, borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
              <strong>{result.email}</strong>
              <span style={{ color: result.status === 'created' ? '#047857' : '#b91c1c', fontWeight: 800 }}>{result.status}</span>
              <span style={{ color: '#64748b' }}>{result.message}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
