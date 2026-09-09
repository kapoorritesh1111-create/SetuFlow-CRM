'use client';

import { useMemo, useState } from 'react';

type Assignee = { userId: string; name: string; email: string; roles: string[] };
type ParsedRow = {
  contactName: string;
  company: string;
  mobile: string;
  email: string;
  city: string;
  requirement: string;
  notes: string;
  assignedTo: string;
  source: string;
};

const HEADERS = ['Contact Name','Company','Mobile','Email','City','Requirement','Notes','Assigned To','Source'];

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(current.trim());
      current = '';
    } else current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) return [] as ParsedRow[];
  const headers = parseCsvLine(lines[0]);
  const index = Object.fromEntries(headers.map((header, idx) => [header.trim().toLowerCase(), idx]));
  const read = (values: string[], name: string) => values[index[name.toLowerCase()] ?? -1] ?? '';
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return {
      contactName: read(values, 'Contact Name'), company: read(values, 'Company'), mobile: read(values, 'Mobile'),
      email: read(values, 'Email'), city: read(values, 'City'), requirement: read(values, 'Requirement'),
      notes: read(values, 'Notes'), assignedTo: read(values, 'Assigned To'), source: read(values, 'Source'),
    };
  });
}

export function StarkLeadImportClient({ assignees, isFieldSales, currentUserId }: { assignees: Assignee[]; isFieldSales: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [assignUserId, setAssignUserId] = useState(isFieldSales ? currentUserId : '');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const localValidation = useMemo(() => rows.map((row, index) => ({
    row: index + 2,
    ready: Boolean(row.contactName.trim() && row.mobile.trim()),
    message: !row.contactName.trim() ? 'Contact Name required' : !row.mobile.trim() ? 'Mobile required' : 'Ready',
  })), [rows]);
  const readyCount = localValidation.filter((item) => item.ready).length;

  async function handleFile(file: File | null) {
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setRows([]);
      setStatus('This first production importer accepts CSV. Save Excel files as CSV (UTF-8) before upload.');
      return;
    }
    const text = await file.text();
    const parsed = parseCsv(text);
    setRows(parsed);
    setStatus(parsed.length ? `${parsed.length} lead row${parsed.length === 1 ? '' : 's'} found.` : 'No lead rows found.');
  }

  async function importRows() {
    if (!readyCount || busy) return;
    setBusy(true);
    setResult(null);
    setStatus('Validating duplicates and assignments…');
    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows, assignUserId: assignUserId || null }),
      });
      const payload = await response.json();
      setResult(payload);
      if (!response.ok && payload.error) setStatus(payload.error);
      else setStatus(`${payload.imported ?? 0} leads imported into the CRM.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed.');
    } finally { setBusy(false); }
  }

  return <div className="space-y-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Capture · Lead import</p><h1 className="mt-1 text-2xl font-black text-slate-950">Import external and field sales leads</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Upload a CSV, preview the rows, validate required fields and duplicates, then create CRM Leads with source tracking and explicit ownership.</p></div>
        <a href="/templates/stark-lead-import-template.csv" download className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100">Download Import Template</a>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_260px]">
        <label className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-700">Upload CSV
          <input type="file" accept=".csv,text/csv,.xlsx" className="mt-3 block w-full text-xs" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
          <span className="mt-2 block text-[11px] font-medium text-slate-500">{fileName || 'No file selected'}</span>
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-700">Assign imported leads to
          <select disabled={isFieldSales} value={assignUserId} onChange={(event) => setAssignUserId(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs">
            {!isFieldSales ? <option value="">Use spreadsheet Assigned To / current user</option> : null}
            {assignees.map((assignee) => <option key={assignee.userId} value={assignee.userId}>{assignee.name || assignee.email}</option>)}
          </select>
          {isFieldSales ? <span className="mt-2 block text-[10px] font-medium text-slate-500">Field Sales imports are always owned by the signed-in Field Sales user.</span> : null}
        </label>
      </div>
    </section>

    {rows.length ? <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 className="text-sm font-black text-slate-950">Preview & validation</h2><p className="mt-1 text-xs text-slate-500">{rows.length} found · {readyCount} locally ready · {rows.length - readyCount} need correction</p></div>
        <button onClick={importRows} disabled={!readyCount || busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Importing…' : `Import ${readyCount} Leads`}</button>
      </div>
      <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[980px] text-xs"><thead className="sticky top-0 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Row</th>{HEADERS.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}<th className="px-3 py-2">Status</th></tr></thead><tbody>{rows.map((row, index) => { const validation = localValidation[index]; return <tr key={index} className="border-t border-slate-100"><td className="px-3 py-2 text-slate-400">{index + 2}</td><td className="px-3 py-2 font-bold text-slate-900">{row.contactName || '—'}</td><td className="px-3 py-2">{row.company || '—'}</td><td className="px-3 py-2">{row.mobile || '—'}</td><td className="px-3 py-2">{row.email || '—'}</td><td className="px-3 py-2">{row.city || '—'}</td><td className="max-w-[220px] truncate px-3 py-2">{row.requirement || '—'}</td><td className="max-w-[180px] truncate px-3 py-2">{row.notes || '—'}</td><td className="px-3 py-2">{row.assignedTo || '—'}</td><td className="px-3 py-2">{row.source || 'Field Sales Import'}</td><td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-[10px] font-black ${validation.ready ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{validation.message}</span></td></tr>; })}</tbody></table></div>
    </section> : null}

    {status ? <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">{status}</section> : null}
    {result ? <section className="grid gap-3 md:grid-cols-3"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase text-emerald-700">Imported</p><p className="mt-1 text-2xl font-black text-emerald-950">{result.imported ?? 0}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase text-amber-700">Duplicates skipped</p><p className="mt-1 text-2xl font-black text-amber-950">{result.duplicates?.length ?? 0}</p></div><div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-[10px] font-black uppercase text-rose-700">Need correction</p><p className="mt-1 text-2xl font-black text-rose-950">{result.errors?.length ?? 0}</p></div></section> : null}
  </div>;
}
