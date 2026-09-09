'use client';

import { useState } from 'react';
import { parseXlsxFirstSheet } from '@/features/leads/lib/xlsx-lite-browser';

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

type ServerPreviewRow = { row: number; status: 'ready' | 'duplicate' | 'error'; message: string; ownerName?: string | null };

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

function matrixToRows(matrix: string[][]) {
  if (!matrix.length) return [] as ParsedRow[];
  const headers = matrix[0].map((header) => String(header ?? '').trim());
  const index = Object.fromEntries(headers.map((header, idx) => [header.toLowerCase(), idx]));
  const read = (values: string[], name: string) => String(values[index[name.toLowerCase()] ?? -1] ?? '').trim();
  return matrix.slice(1).filter((values) => values.some((value) => String(value ?? '').trim())).map((values) => ({
    contactName: read(values, 'Contact Name'), company: read(values, 'Company'), mobile: read(values, 'Mobile'),
    email: read(values, 'Email'), city: read(values, 'City'), requirement: read(values, 'Requirement'),
    notes: read(values, 'Notes'), assignedTo: read(values, 'Assigned To'), source: read(values, 'Source'),
  }));
}

function parseCsv(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  return matrixToRows(lines.map(parseCsvLine));
}

function statusStyle(status: ServerPreviewRow['status'] | undefined) {
  if (status === 'ready') return 'bg-emerald-50 text-emerald-700';
  if (status === 'duplicate') return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}

export function StarkLeadImportClient({ assignees, isFieldSales, currentUserId }: { assignees: Assignee[]; isFieldSales: boolean; currentUserId: string }) {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [assignUserId, setAssignUserId] = useState(isFieldSales ? currentUserId : '');
  const [status, setStatus] = useState('');
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function callImportApi(action: 'preview' | 'commit', candidateRows = rows, assignment = assignUserId) {
    if (!candidateRows.length) return null;
    setBusy(true);
    if (action === 'preview') setStatus('Validating rows, duplicates and assignments…');
    else setStatus('Re-validating and importing ready leads…');
    try {
      const response = await fetch('/api/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rows: candidateRows, assignUserId: assignment || null, fileName }),
      });
      const payload = await response.json();
      setResult(payload);
      if (!response.ok && payload.error) setStatus(payload.error);
      else if (action === 'preview') setStatus(`${payload.found ?? candidateRows.length} leads found · ${payload.ready ?? 0} ready · ${payload.duplicates ?? 0} possible duplicates · ${payload.corrections ?? 0} need correction.`);
      else setStatus(`${payload.imported ?? 0} leads imported into the CRM. Duplicates and invalid rows were not silently created.`);
      return payload;
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Import failed.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(file: File | null) {
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    try {
      const lowerName = file.name.toLowerCase();
      let parsed: ParsedRow[] = [];
      if (lowerName.endsWith('.csv')) parsed = parseCsv(await file.text());
      else if (lowerName.endsWith('.xlsx')) parsed = matrixToRows(await parseXlsxFirstSheet(file));
      else throw new Error('Upload a .xlsx or .csv file.');
      setRows(parsed);
      if (!parsed.length) { setStatus('No lead rows found. Check that the first sheet uses the Setu Flow column headers.'); return; }
      setStatus(`${parsed.length} lead row${parsed.length === 1 ? '' : 's'} found. Running server validation…`);
      await callImportApi('preview', parsed, assignUserId);
    } catch (error) {
      setRows([]);
      setStatus(error instanceof Error ? error.message : 'Unable to read the import file.');
    }
  }

  async function changeAssignment(value: string) {
    setAssignUserId(value);
    if (rows.length) await callImportApi('preview', rows, value);
  }

  const readyCount = Number(result?.ready ?? 0);
  const previewRows = (result?.previewRows ?? []) as ServerPreviewRow[];

  return <div className="space-y-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-600">Capture · Lead import</p><h1 className="mt-1 text-2xl font-black text-slate-950">Import external and field sales leads</h1><p className="mt-2 max-w-3xl text-sm text-slate-600">Upload Excel or CSV, preview validation and duplicates, choose ownership, then import only the clean rows directly into CRM Leads.</p></div>
        <div className="flex flex-wrap gap-2"><a href="/api/leads/import/template" className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-700 hover:bg-blue-100">Download Excel Template</a><a href="/templates/stark-lead-import-template.csv" download className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">CSV Template</a></div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_280px]">
        <label className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-700">Upload Excel or CSV
          <input type="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="mt-3 block w-full text-xs" onChange={(event) => void handleFile(event.target.files?.[0] ?? null)} />
          <span className="mt-2 block text-[11px] font-medium text-slate-500">{fileName || 'No file selected'} · up to 500 rows</span>
        </label>
        <label className="rounded-xl border border-slate-200 bg-white p-4 text-xs font-bold text-slate-700">Assign imported leads to
          <select disabled={isFieldSales || busy} value={assignUserId} onChange={(event) => void changeAssignment(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs">
            {!isFieldSales ? <option value="">Use spreadsheet Assigned To / current user</option> : null}
            {assignees.map((assignee) => <option key={assignee.userId} value={assignee.userId}>{assignee.name || assignee.email} {assignee.roles.includes('field_sales') ? '— Field Sales' : ''}</option>)}
          </select>
          {isFieldSales ? <span className="mt-2 block text-[10px] font-medium text-slate-500">Field Sales imports are always owned by the signed-in Field Sales user.</span> : <span className="mt-2 block text-[10px] font-medium text-slate-500">Assign all here, or leave blank to use the spreadsheet Assigned To column.</span>}
        </label>
      </div>
    </section>

    {rows.length ? <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div><h2 className="text-sm font-black text-slate-950">Preview & validation</h2><p className="mt-1 text-xs text-slate-500">{result ? `${result.found ?? rows.length} found · ${result.ready ?? 0} ready · ${result.duplicates ?? 0} duplicates · ${result.corrections ?? 0} need correction` : `${rows.length} rows loaded`}</p></div>
        <button onClick={() => void callImportApi('commit')} disabled={!readyCount || busy} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">{busy ? 'Working…' : `Import ${readyCount} Leads`}</button>
      </div>
      <div className="max-h-[520px] overflow-auto"><table className="w-full min-w-[1040px] text-xs"><thead className="sticky top-0 bg-slate-50 text-left text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Row</th>{HEADERS.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}<th className="px-3 py-2">Validation</th></tr></thead><tbody>{rows.map((row, index) => { const validation = previewRows[index]; return <tr key={index} className={`border-t border-slate-100 ${validation?.status === 'duplicate' ? 'bg-amber-50/40' : validation?.status === 'error' ? 'bg-rose-50/30' : ''}`}><td className="px-3 py-2 text-slate-400">{index + 2}</td><td className="px-3 py-2 font-bold text-slate-900">{row.contactName || '—'}</td><td className="px-3 py-2">{row.company || '—'}</td><td className="px-3 py-2">{row.mobile || '—'}</td><td className="px-3 py-2">{row.email || '—'}</td><td className="px-3 py-2">{row.city || '—'}</td><td className="max-w-[220px] truncate px-3 py-2">{row.requirement || '—'}</td><td className="max-w-[180px] truncate px-3 py-2">{row.notes || '—'}</td><td className="px-3 py-2">{row.assignedTo || '—'}</td><td className="px-3 py-2">{row.source || (isFieldSales ? 'Field Sales Import' : 'Existing Prospect List')}</td><td className="max-w-[260px] px-3 py-2"><span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black ${statusStyle(validation?.status)}`}>{validation?.message || (busy ? 'Validating…' : 'Pending validation')}</span>{validation?.ownerName ? <p className="mt-1 text-[9px] text-slate-400">Owner: {validation.ownerName}</p> : null}</td></tr>; })}</tbody></table></div>
    </section> : null}

    {status ? <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900">{status}</section> : null}
    {result ? <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase text-emerald-700">Ready</p><p className="mt-1 text-2xl font-black text-emerald-950">{result.ready ?? 0}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase text-amber-700">Duplicates</p><p className="mt-1 text-2xl font-black text-amber-950">{result.duplicates ?? 0}</p></div><div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-[10px] font-black uppercase text-rose-700">Need correction</p><p className="mt-1 text-2xl font-black text-rose-950">{result.corrections ?? 0}</p></div><div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-[10px] font-black uppercase text-blue-700">Imported</p><p className="mt-1 text-2xl font-black text-blue-950">{result.imported ?? 0}</p></div></section> : null}
  </div>;
}
