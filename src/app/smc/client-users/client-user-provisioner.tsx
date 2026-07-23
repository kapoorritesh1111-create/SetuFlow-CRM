'use client';

import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

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

const MAX_BATCH = 25;

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

function csvEscape(value: string) {
  if (!/[",\n\r]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];

    if (character === '"') {
      if (quoted && next === '"') {
        currentCell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === ',' && !quoted) {
      currentRow.push(currentCell.trim());
      currentCell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && next === '\n') index += 1;
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += character;
  }

  currentRow.push(currentCell.trim());
  if (currentRow.some((cell) => cell.length > 0)) rows.push(currentRow);
  return rows;
}

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

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

export function ClientUserProvisioner({
  organizations,
  roles,
  operatorName,
  initialOrganizationId,
}: {
  organizations: ClientOrgOption[];
  roles: RoleOption[];
  operatorName: string;
  initialOrganizationId?: string | null;
}) {
  const initialOrg = organizations.some((org) => org.id === initialOrganizationId)
    ? initialOrganizationId ?? ''
    : organizations[0]?.id ?? '';

  const [organizationId, setOrganizationId] = useState(initialOrg);
  const [rows, setRows] = useState<UserRow[]>([newRow(0)]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [message, setMessage] = useState('');
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const selectedOrganization = organizations.find((org) => org.id === organizationId) ?? null;
  const roleOptions = useMemo(() => canonicalRoleOptions(roles, organizationId), [roles, organizationId]);
  const roleLookup = useMemo(
    () => new Map(roleOptions.map((role) => [role.name.trim().toLowerCase(), role.name])),
    [roleOptions],
  );
  const remainingSeats = selectedOrganization?.maxUsers
    ? Math.max(0, selectedOrganization.maxUsers - selectedOrganization.activeUsers)
    : null;

  function updateRow(id: string, patch: Partial<UserRow>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function addRow() {
    if (rows.length >= MAX_BATCH) return;
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
    if (uploadRef.current) uploadRef.current.value = '';
  }

  function downloadTemplate() {
    const csv = [
      ['full_name', 'username', 'email', 'role'].map(csvEscape).join(','),
      ',,,',
    ].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `setu-flow-client-users-${selectedOrganization?.slug ?? 'template'}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function uploadTemplate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setResults([]);
    setMessage('');

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage('Upload the CSV template downloaded from this page.');
      event.target.value = '';
      return;
    }

    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) {
        setMessage('The CSV does not contain any user rows.');
        return;
      }

      const headers = parsed[0].map(normalizeHeader);
      const findColumn = (...aliases: string[]) => aliases.map((alias) => headers.indexOf(alias)).find((index) => index >= 0) ?? -1;
      const fullNameColumn = findColumn('full_name', 'fullname', 'name');
      const usernameColumn = findColumn('username', 'user_name');
      const emailColumn = findColumn('email', 'email_address');
      const roleColumn = findColumn('role', 'role_name');

      if ([fullNameColumn, usernameColumn, emailColumn, roleColumn].some((index) => index < 0)) {
        setMessage('CSV headers must include full_name, username, email, and role.');
        return;
      }

      const imported = parsed
        .slice(1)
        .map((cells, index) => {
          const importedRole = String(cells[roleColumn] ?? '').trim();
          return {
            id: `${Date.now()}-upload-${index}`,
            fullName: String(cells[fullNameColumn] ?? '').trim(),
            username: String(cells[usernameColumn] ?? '').trim(),
            email: String(cells[emailColumn] ?? '').trim().toLowerCase(),
            roleName: roleLookup.get(importedRole.toLowerCase()) ?? importedRole,
          } satisfies UserRow;
        })
        .filter((row) => row.fullName || row.username || row.email || row.roleName);

      if (!imported.length) {
        setMessage('The CSV does not contain any completed user rows.');
        return;
      }
      if (imported.length > MAX_BATCH) {
        setMessage(`The CSV contains ${imported.length} users. A maximum of ${MAX_BATCH} can be created at one time.`);
        return;
      }

      const invalidRoles = Array.from(new Set(
        imported
          .filter((row) => !roleLookup.has(row.roleName.toLowerCase()))
          .map((row) => row.roleName || '(blank)'),
      ));

      setRows(imported);
      setMessage(
        invalidRoles.length
          ? `Imported ${imported.length} users. Correct these role values before creating users: ${invalidRoles.join(', ')}.`
          : `Imported ${imported.length} users. Review the rows, enter the temporary password, then create the accounts.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to read the CSV file.');
    } finally {
      event.target.value = '';
    }
  }

  async function provision() {
    setMessage('');
    setResults([]);

    const activeRows = rows
      .map((row) => ({
        full_name: row.fullName.trim(),
        username: row.username.trim(),
        email: row.email.trim().toLowerCase(),
        role_name: row.roleName.trim(),
      }))
      .filter((row) => row.full_name || row.username || row.email || row.role_name);

    if (!organizationId) return setMessage('Choose a client organization.');
    if (!password || password.length < 12) return setMessage('Temporary password must be at least 12 characters.');
    if (!activeRows.length) return setMessage('Add or upload at least one user.');
    if (activeRows.some((row) => !row.full_name || !row.username || !row.email || !row.role_name)) {
      return setMessage('Every row needs full name, username, email, and role.');
    }
    const invalidRole = activeRows.find((row) => !roleLookup.has(row.role_name.toLowerCase()));
    if (invalidRole) return setMessage(`Role is not available for this organization: ${invalidRole.role_name}`);

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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create users.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ padding: 24, display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#279491', textTransform: 'uppercase', letterSpacing: '.12em' }}>SMC internal only</div>
          <h1 style={{ margin: '6px 0 0', fontSize: 25, color: '#0f172a' }}>Client User Setup</h1>
          <p style={{ margin: '7px 0 0', color: '#64748b', fontSize: 13, maxWidth: 760 }}>
            Download the CSV, add the client users, upload it here, review the roles, then enter a temporary password in SMC to create the accounts.
          </p>
        </div>
        <div style={{ ...cardStyle, padding: '11px 14px', minWidth: 230 }}>
          <span style={{ display: 'block', fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em' }}>Authorized operator</span>
          <strong style={{ display: 'block', marginTop: 4, fontSize: 13 }}>{operatorName}</strong>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18, display: 'grid', gridTemplateColumns: 'minmax(260px, 1.3fr) minmax(230px, .7fr)', gap: 16 }}>
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

      <div style={{ ...cardStyle, padding: 18, display: 'grid', gridTemplateColumns: '1fr auto', gap: 18, alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 15 }}>1. Download and complete the user template</h2>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 11 }}>
            CSV columns: full_name, username, email, role. Passwords are intentionally excluded from the file.
          </p>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 10 }}>
            Available roles for {selectedOrganization?.name ?? 'this organization'}: {roleOptions.map((role) => role.name).join(', ') || 'No roles configured'}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button type="button" className="smc-btn" onClick={downloadTemplate}>Download CSV template</button>
          <input ref={uploadRef} type="file" accept=".csv,text/csv" onChange={uploadTemplate} style={{ display: 'none' }} />
          <button type="button" className="smc-btn primary" onClick={() => uploadRef.current?.click()}>Upload completed CSV</button>
        </div>
      </div>

      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 15 }}>2. Review users and roles</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 11 }}>Maximum {MAX_BATCH} users per batch. Existing Auth users are skipped for safety.</p>
          </div>
          <button type="button" onClick={addRow} disabled={rows.length >= MAX_BATCH} className="smc-btn primary">+ Add user</button>
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
                    <select value={roleLookup.get(row.roleName.toLowerCase()) ?? ''} onChange={(event) => updateRow(row.id, { roleName: event.target.value })} style={fieldStyle}>
                      <option value="">Choose role</option>
                      {roleOptions.map((role) => <option key={role.id} value={role.name}>{role.name}</option>)}
                    </select>
                    {row.roleName && !roleLookup.has(row.roleName.toLowerCase()) ? <span style={{ display: 'block', marginTop: 4, color: '#b91c1c', fontSize: 10 }}>Imported role “{row.roleName}” is not available.</span> : null}
                  </td>
                  <td style={{ padding: 8, borderBottom: '1px solid #f1f5f9' }}><button type="button" className="smc-btn" onClick={() => removeRow(row.id)} disabled={rows.length === 1}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: 18, display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) auto', gap: 18, alignItems: 'end' }}>
        <label style={{ fontSize: 11, color: '#475569' }}>
          3. Temporary password for this batch
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Minimum 12 characters" style={fieldStyle} />
            <button type="button" className="smc-btn" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Hide' : 'Show'}</button>
            <button type="button" className="smc-btn" onClick={() => { setPassword(generatePassword()); setShowPassword(true); }}>Generate</button>
          </div>
          <span style={{ display: 'block', marginTop: 6, fontSize: 10, color: '#94a3b8' }}>The password is never included in the CSV and is never written to audit logs.</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="smc-btn" onClick={clearCompleted}>Clear</button>
          <button type="button" className="smc-btn primary" onClick={provision} disabled={submitting}>{submitting ? 'Creating users...' : `Create ${rows.length} user${rows.length === 1 ? '' : 's'}`}</button>
        </div>
      </div>

      {message ? <div style={{ border: `1px solid ${results.some((item) => item.status === 'failed') ? '#fecaca' : '#dbe4ef'}`, background: results.some((item) => item.status === 'failed') ? '#fef2f2' : '#f8fafc', color: results.some((item) => item.status === 'failed') ? '#b91c1c' : '#334155', borderRadius: 14, padding: 13, fontSize: 12 }}>{message}</div> : null}

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
