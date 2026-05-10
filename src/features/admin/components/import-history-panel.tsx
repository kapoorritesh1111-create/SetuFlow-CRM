"use client";

import { useEffect, useState } from "react";

type ImportIssue = {
  id?: string;
  source_row_no?: number | null;
  field_name?: string | null;
  severity?: string | null;
  issue_code?: string | null;
  issue_message?: string | null;
  blocking_flag?: boolean | null;
};

type ImportRun = {
  id: string;
  import_type?: string | null;
  source_file_name?: string | null;
  status?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  rows_read?: number | null;
  rows_valid?: number | null;
  rows_warning?: number | null;
  rows_blocked?: number | null;
  rows_inserted?: number | null;
  rows_updated?: number | null;
  summary_payload?: any;
  import_issues?: ImportIssue[] | null;
};

export type CatalogImportRun = ImportRun;

function statusClass(status: string | null | undefined) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "failed") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "running") return "bg-blue-50 text-blue-700 ring-blue-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadTextFile(fileName: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function rowSummaries(run: ImportRun) {
  const summary = run.summary_payload ?? {};
  return Array.isArray(summary.row_summaries) ? summary.row_summaries : [];
}

function downloadRunReport(run: ImportRun) {
  const rows = rowSummaries(run);
  const issueRows = run.import_issues ?? [];
  const lines = ["type,row,entity,name,sku,action,pricing,field,severity,message"];
  for (const row of rows) {
    lines.push(["summary", row.row, row.entity, row.name, row.sku, row.action, row.pricing, "", "", row.message].map(csvEscape).join(","));
  }
  for (const issue of issueRows) {
    lines.push(["issue", issue.source_row_no, "", "", "", "", "", issue.field_name, issue.severity, issue.issue_message].map(csvEscape).join(","));
  }
  downloadTextFile(`import-run-${run.id.slice(0, 8)}-report.csv`, lines.join("\n"));
}

export function ImportHistoryPanel({ importRuns = [] }: { importRuns?: ImportRun[] }) {
  const [loadedRuns, setLoadedRuns] = useState<ImportRun[]>(importRuns);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (importRuns.length) {
      setLoadedRuns(importRuns);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/admin/catalog/import-history")
      .then((response) => response.json())
      .then((payload) => {
        if (cancelled) return;
        if (payload.error) setLoadError(payload.error);
        else setLoadedRuns(payload.importRuns ?? []);
      })
      .catch(() => { if (!cancelled) setLoadError("Import history could not be loaded."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [importRuns]);

  const runs = loadedRuns;
  const latest = runs[0] ?? null;
  const completed = runs.filter((run) => run.status === "completed").length;
  const blocked = runs.reduce((sum, run) => sum + Number(run.rows_blocked ?? 0), 0);
  const warnings = runs.reduce((sum, run) => sum + Number(run.rows_warning ?? 0), 0);

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-blue-700">Import history</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">Recent setup imports and issue reports</h3>
          <p className="mt-1 text-sm text-slate-500">Review completed imports, blocked rows, warnings, and row-level summaries without rerunning the wizard.</p>
        </div>
        {latest ? <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClass(latest.status)}`}>Latest: {latest.status ?? "unknown"}</span> : null}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Metric label="Recent runs" value={runs.length} />
        <Metric label="Completed" value={completed} />
        <Metric label="Warnings" value={warnings} />
        <Metric label="Blocked rows" value={blocked} />
      </div>

      {loading ? <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading import history...</div> : null}
      {loadError ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError}</div> : null}

      <div className="space-y-3">
        {runs.length ? runs.map((run) => {
          const issues = run.import_issues ?? [];
          const summaries = rowSummaries(run);
          return (
            <article key={run.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(run.status)}`}>{run.status ?? "unknown"}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{run.import_type ?? "import"}</span>
                    {run.source_file_name ? <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">{run.source_file_name}</span> : null}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-950">Run {run.id.slice(0, 8)} · {run.started_at ? new Date(run.started_at).toLocaleString() : "Recent"}</p>
                  <p className="mt-1 text-xs text-slate-500">Rows read {run.rows_read ?? 0} · inserted {run.rows_inserted ?? 0} · updated {run.rows_updated ?? 0} · warnings {run.rows_warning ?? 0} · blocked {run.rows_blocked ?? 0}</p>
                </div>
                <button type="button" onClick={() => downloadRunReport(run)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">Download report</button>
              </div>

              {summaries.length ? (
                <div className="mt-3 max-h-44 overflow-auto rounded-2xl bg-white ring-1 ring-slate-200">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600"><tr>{["Row", "Name", "SKU", "Action", "Pricing", "Message"].map((header) => <th key={header} className="px-3 py-2 font-semibold">{header}</th>)}</tr></thead>
                    <tbody>{summaries.slice(0, 10).map((row: any, index: number) => <tr key={`${row.row}-${index}`} className="border-t border-slate-100 text-slate-700"><td className="px-3 py-2">{row.row}</td><td className="px-3 py-2 font-medium">{row.name}</td><td className="px-3 py-2">{row.sku ?? "—"}</td><td className="px-3 py-2">{row.action}</td><td className="px-3 py-2">{row.pricing}</td><td className="px-3 py-2">{row.message}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}

              {issues.length ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <p className="font-semibold">Issues captured</p>
                  <ul className="mt-1 space-y-1">{issues.slice(0, 5).map((issue, index) => <li key={issue.id ?? index}>Row {issue.source_row_no ?? "—"} · {issue.field_name ?? "import"}: {issue.issue_message}</li>)}</ul>
                </div>
              ) : null}
            </article>
          );
        }) : !loading ? <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">No import runs have been recorded yet. After the next category or product import, the run summary will appear here.</div> : null}
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold text-slate-950">{value}</p></div>;
}
