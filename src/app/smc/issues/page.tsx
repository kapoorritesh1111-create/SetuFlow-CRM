"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

type Attachment = { url: string; name: string; type?: string; size?: number; path?: string };
type Issue = {
  id: string;
  issue_ref: string;
  title: string;
  status: string;
  priority: string | null;
  severity: string | null;
  issue_type: string | null;
  issue_category: string | null;
  sprint_number: number;
  story_points: number | null;
  assigned_to: string | null;
  reporter_name: string | null;
  area: string | null;
  workflow_area: string | null;
  description: string | null;
  fix_applied: string | null;
  created_at: string;
  resolved_at: string | null;
  target_date: string | null;
  customer_impact: string | null;
  labels: string[] | null;
  sprint_label: string | null;
  root_cause: string | null;
  regression_test: string | null;
  files_changed: string[] | null;
  git_branch: string | null;
  acceptance_criteria: string | null;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  environment: string | null;
  affected_module: string | null;
  attachments: Attachment[] | string[] | null;
};

type SortKey = "issue_ref" | "title" | "status" | "severity" | "area" | "sprint_number" | "story_points" | "assigned_to" | "created_at" | "issue_type";
type SortDir = "asc" | "desc";

const COLS: { key: SortKey; label: string }[] = [
  { key: "issue_ref", label: "Ref" },
  { key: "title", label: "Title" },
  { key: "severity", label: "Severity" },
  { key: "area", label: "Area" },
  { key: "status", label: "Status" },
  { key: "issue_type", label: "Type" },
  { key: "story_points", label: "Pts" },
  { key: "assigned_to", label: "Assignee" },
  { key: "sprint_number", label: "Sprint" },
];

const sevCls = (s: string | null) => {
  const l = (s ?? "").toLowerCase();
  return l.includes("critical") ? "critical" : l.includes("high") ? "high" : l.includes("medium") ? "medium" : "low";
};
const stCls = (s: string) => {
  const l = s.toLowerCase();
  return l === "resolved" ? "resolved" : l.includes("review") ? "review" : l.includes("progress") ? "in-progress" : l === "blocked" ? "blocked" : l === "deferred" ? "deferred" : "open";
};
const typCls = (t: string | null) => {
  const l = (t ?? "").toLowerCase();
  return l.includes("bug") ? "bug" : l.includes("doc") ? "doc" : l.includes("ux") ? "ux" : l.includes("enh") ? "enhancement" : l.includes("test") ? "test" : l.includes("devops") ? "devops" : "feat";
};
const ini = (n: string | null) => n ? n.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() : "";
const ago = (d: string) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  return days === 0 ? "today" : days < 30 ? `${days}d ago` : new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const emptyToNull = (v: FormDataEntryValue | null) => {
  const text = typeof v === "string" ? v.trim() : "";
  return text.length ? text : null;
};
const parseOptionalInt = (v: FormDataEntryValue | null) => {
  const text = typeof v === "string" ? v.trim() : "";
  if (!text) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
};
function normalizeAttachments(value: Issue["attachments"] | undefined): Attachment[] {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => typeof item === "string" ? { url: item, name: item.split("/").pop() || `Attachment ${index + 1}` } : item).filter((item) => Boolean(item.url));
}
function fileIcon(attachment: Attachment) {
  const name = attachment.name.toLowerCase();
  const type = (attachment.type ?? "").toLowerCase();
  if (type.includes("image") || /\.(png|jpg|jpeg|gif|webp|svg)$/.test(name)) return "🖼";
  if (type.includes("pdf") || name.endsWith(".pdf")) return "PDF";
  if (/\.(doc|docx|txt|md)$/.test(name)) return "DOC";
  if (/\.(xls|xlsx|csv)$/.test(name)) return "XLS";
  return "FILE";
}

function SmcIssuesContent() {
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("sprint_number");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [hideRes, setHideRes] = useState(true);
  const [hideDef, setHideDef] = useState(true);
  const [search, setSearch] = useState("");
  const [kpiF, setKpiF] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sprintFilter, setSprintFilter] = useState<number | null>(null);
  const [viewFilter, setViewFilter] = useState<string | null>(null);
  const [drawerIssue, setDrawerIssue] = useState<Issue | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editIssue, setEditIssue] = useState<Partial<Issue>>({});
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);

  const refreshIssues = useCallback(async () => {
    const res = await fetch("/api/smc/issues?limit=1000", { cache: "no-store" });
    const data = await res.json();
    setIssues(data.issues ?? []);
  }, []);

  useEffect(() => { refreshIssues().catch(() => null).finally(() => setLoading(false)); }, [refreshIssues]);
  useEffect(() => {
    const type = searchParams.get("type");
    const sprint = searchParams.get("sprint");
    const view = searchParams.get("view");
    const q = searchParams.get("q");
    setTypeFilter(type);
    setSprintFilter(sprint && Number.isFinite(Number(sprint)) ? Number(sprint) : null);
    setViewFilter(view);
    if (q) setSearch(q);
    setKpiF(null);
  }, [searchParams]);
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showModal) { setShowModal(false); return; }
        if (drawerIssue) { setDrawerIssue(null); }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showModal, drawerIssue]);

  const counts = useMemo(() => ({
    total: issues.length,
    open: issues.filter((i) => i.status === "Open" || i.status === "open").length,
    critical: issues.filter((i) => i.severity?.toLowerCase().includes("critical")).length,
    high: issues.filter((i) => i.severity?.toLowerCase().includes("high")).length,
    inProgress: issues.filter((i) => i.status.toLowerCase().includes("progress")).length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
    deferred: issues.filter((i) => i.status === "Deferred").length,
  }), [issues]);

  const filtered = useMemo(() => {
    let list = [...issues];
    if (typeFilter) list = list.filter((i) => (i.issue_type ?? i.issue_category ?? "").toLowerCase() === typeFilter.toLowerCase());
    if (sprintFilter !== null) list = list.filter((i) => Number(i.sprint_number) === sprintFilter);
    if (viewFilter === "backlog") list = list.filter((i) => !["resolved", "deferred"].includes(i.status.toLowerCase()) && Number(i.sprint_number) < 27);
    if (hideRes && kpiF !== "resolved") list = list.filter((i) => i.status !== "Resolved");
    if (hideDef && kpiF !== "deferred") list = list.filter((i) => i.status !== "Deferred");
    if (kpiF === "open") list = list.filter((i) => i.status === "Open" || i.status === "open");
    if (kpiF === "critical") list = list.filter((i) => i.severity?.toLowerCase().includes("critical"));
    if (kpiF === "high") list = list.filter((i) => i.severity?.toLowerCase().includes("high"));
    if (kpiF === "progress") list = list.filter((i) => i.status.toLowerCase().includes("progress"));
    if (kpiF === "resolved") list = issues.filter((i) => i.status === "Resolved");
    if (kpiF === "deferred") list = issues.filter((i) => i.status === "Deferred");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.issue_ref.toLowerCase().includes(q) || (i.area ?? "").toLowerCase().includes(q) || (i.assigned_to ?? "").toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv)) : -String(av).localeCompare(String(bv));
    });
    return list;
  }, [issues, hideRes, hideDef, kpiF, search, sortKey, sortDir, typeFilter, sprintFilter, viewFilter]);

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setSaveError(null);
    try {
      const uploaded: Attachment[] = [];
      for (const file of list) {
        const form = new FormData();
        form.append("file", file);
        form.append("issue_ref", editIssue.issue_ref ?? "draft");
        const res = await fetch("/api/smc/upload", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Failed to upload ${file.name}`);
        uploaded.push({ url: data.url, name: data.name ?? file.name, type: data.type ?? file.type, size: data.size ?? file.size, path: data.path });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }
  function openCreateModal() { setEditIssue({}); setAttachments([]); setSaveError(null); setShowModal(true); }
  function openEditModal(issue: Issue) { setEditIssue(issue); setAttachments(normalizeAttachments(issue.attachments)); setSaveError(null); setShowModal(true); setDrawerIssue(null); }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); void uploadFiles(event.dataTransfer.files); }
  function onSelectFiles(event: ChangeEvent<HTMLInputElement>) { if (event.target.files) void uploadFiles(event.target.files); event.target.value = ""; }

  const handleSort = (key: SortKey) => { if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc"); else { setSortKey(key); setSortDir("desc"); } };
  const handleModalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    const form = new FormData(event.currentTarget);
    const title = emptyToNull(form.get("title"));
    if (!title) { setSaveError("Title is required."); setSaving(false); return; }
    const issueType = emptyToNull(form.get("issue_type")) ?? "Bug";
    const area = emptyToNull(form.get("area"));
    const payload = {
      title,
      description: emptyToNull(form.get("description")),
      acceptance_criteria: emptyToNull(form.get("acceptance_criteria")),
      regression_test: emptyToNull(form.get("regression_test")),
      steps_to_reproduce: emptyToNull(form.get("steps_to_reproduce")),
      expected_behavior: emptyToNull(form.get("expected_behavior")),
      actual_behavior: emptyToNull(form.get("actual_behavior")),
      git_branch: emptyToNull(form.get("git_branch")),
      fix_applied: emptyToNull(form.get("fix_applied")),
      status: emptyToNull(form.get("status")) ?? "Open",
      issue_type: issueType,
      issue_category: issueType,
      severity: emptyToNull(form.get("severity")) ?? "Medium",
      priority: emptyToNull(form.get("priority")) ?? "P2",
      assigned_to: emptyToNull(form.get("assigned_to")),
      reporter_name: emptyToNull(form.get("reporter_name")) ?? "Ritesh Kapoor",
      sprint_number: parseOptionalInt(form.get("sprint_number")) ?? 27,
      story_points: parseOptionalInt(form.get("story_points")),
      area,
      workflow_area: area,
      environment: emptyToNull(form.get("environment")) ?? "Production",
      customer_impact: emptyToNull(form.get("customer_impact")) ?? "none",
      target_date: emptyToNull(form.get("target_date")),
      attachments,
    };
    try {
      const url = editIssue.id ? `/api/smc/issues/${editIssue.id}` : "/api/smc/issues";
      const res = await fetch(url, { method: editIssue.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Issue save failed.");
      await refreshIssues();
      setShowModal(false);
      setEditIssue({});
      setAttachments([]);
      setDrawerIssue((data.issue ?? null) as Issue | null);
    } catch (err) { setSaveError(err instanceof Error ? err.message : "Issue save failed."); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>Loading issues…</div>;

  return <>
    <div className="smc-ph"><div><div className="bc">Engineering</div><h1>Issues</h1></div><div className="ha"><button className="smc-btn smc-btn-p" onClick={openCreateModal}>+ New Issue</button></div></div>
    <div className="smc-kr">{[{ k: "", v: counts.total, l: "Total", c: "" }, { k: "open", v: counts.open, l: "Open", c: "amber" }, { k: "critical", v: counts.critical, l: "Critical", c: "red" }, { k: "high", v: counts.high, l: "High", c: "amber" }, { k: "progress", v: counts.inProgress, l: "In Progress", c: "teal" }, { k: "resolved", v: counts.resolved, l: "Done", c: "green" }, { k: "deferred", v: counts.deferred, l: "Deferred", c: "" }].map((kp) => <div key={kp.l} className={`smc-kp ${kpiF === kp.k ? "filter-active" : kp.c}`} onClick={() => kp.k && setKpiF((v) => v === kp.k ? null : kp.k)}><div className="v">{kp.v}</div><div className="l">{kp.l}</div></div>)}</div>
    <div className="smc-tl"><input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search issues…" style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "5px 12px", fontSize: 12, width: 260, outline: "none", fontFamily: "inherit" }} /><div className="smc-sp" /><button className={`smc-chip ${hideRes ? "hide-active" : ""}`} onClick={() => { setHideRes(!hideRes); setKpiF(null); }}>{hideRes ? "Hiding resolved" : "Show resolved"}</button><button className={`smc-chip ${hideDef ? "hide-active" : ""}`} onClick={() => { setHideDef(!hideDef); setKpiF(null); }}>{hideDef ? "Hiding deferred" : "Show deferred"}</button><span style={{ fontSize: 11, color: "#64748b", fontFamily: "'DM Mono',monospace" }}>{filtered.length} issues</span></div>
    <div className="smc-cs"><table className="smc-it"><thead><tr>{COLS.map((col) => <th key={col.key} onClick={() => handleSort(col.key)} className={sortKey === col.key ? "sorted" : ""}>{col.label} <span className="sort-arrow">{sortKey === col.key ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}</span></th>)}</tr></thead><tbody>{filtered.map((issue) => <tr key={issue.id} onClick={() => setDrawerIssue(issue)}><td><span className="smc-iref">{issue.issue_ref}</span></td><td><div className="smc-itc"><div className={`smc-pd ${sevCls(issue.severity)}`} /><span className="smc-itn">{issue.title}</span></div></td><td><span className={`smc-lb ${sevCls(issue.severity)}`}>{issue.severity ?? "Low"}</span></td><td style={{ fontSize: 11.5, color: "#475569" }}>{issue.area ?? "—"}</td><td><span className={`smc-st ${stCls(issue.status)}`}>{issue.status}</span></td><td><span className={`smc-lb ${typCls(issue.issue_type)}`}>{issue.issue_type ?? issue.issue_category ?? "Task"}</span></td><td className="smc-pts">{issue.story_points ?? "—"}</td><td>{issue.assigned_to ? <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div className="smc-aa" style={{ background: "#279491" }}>{ini(issue.assigned_to)}</div><span style={{ fontSize: 11, color: "#475569" }}>{issue.assigned_to.split(" ")[0]}</span></div> : null}</td><td className="smc-pts">{issue.sprint_number}</td></tr>)}</tbody></table></div>

    <div className={`smc-drawer-bg ${drawerIssue ? "open" : ""}`} onClick={() => setDrawerIssue(null)} />
    <div className={`smc-drawer ${drawerIssue ? "open" : ""}`}>{drawerIssue && <><div className="smc-drawer-head"><button className="xbtn" onClick={() => setDrawerIssue(null)}>✕</button><span className="smc-iref" style={{ fontSize: 12 }}>{drawerIssue.issue_ref}</span><span className={`smc-lb ${typCls(drawerIssue.issue_type)}`}>{drawerIssue.issue_type ?? "Task"}</span><span className={`smc-st ${stCls(drawerIssue.status)}`}>{drawerIssue.status}</span><div style={{ marginLeft: "auto" }}><button className="smc-btn" style={{ fontSize: 10, padding: "3px 8px" }} onClick={() => openEditModal(drawerIssue)}>Edit</button></div></div><div className="smc-drawer-body"><h2>{drawerIssue.title}</h2><p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Created by {drawerIssue.reporter_name ?? "Unknown"} · Sprint {drawerIssue.sprint_number}{drawerIssue.story_points ? ` · ${drawerIssue.story_points} pts` : ""}</p><div className="smc-detail-meta"><span className="ml">Status</span><span className="mv"><span className={`smc-st ${stCls(drawerIssue.status)}`}>{drawerIssue.status}</span></span><span className="ml">Severity</span><span className="mv">{drawerIssue.severity ?? "—"}</span><span className="ml">Priority</span><span className="mv">{drawerIssue.priority ?? "—"}</span><span className="ml">Assignee</span><span className="mv">{drawerIssue.assigned_to ?? "Unassigned"}</span><span className="ml">Area</span><span className="mv">{drawerIssue.area ?? "—"}</span><span className="ml">Environment</span><span className="mv">{drawerIssue.environment ?? "Production"}</span></div>{drawerIssue.description && <div className="smc-detail-desc">{drawerIssue.description}</div>}{normalizeAttachments(drawerIssue.attachments).length > 0 && <div className="smc-detail-section"><h3>Attachments</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{normalizeAttachments(drawerIssue.attachments).map((attachment) => <a key={attachment.url} href={attachment.url} target="_blank" rel="noreferrer" className="smc-chip" style={{ textDecoration: "none" }}>{fileIcon(attachment)} {attachment.name}</a>)}</div></div>}{drawerIssue.fix_applied && <><div className="smc-detail-section"><h3>Fix Applied</h3></div><div className="smc-detail-desc">{drawerIssue.fix_applied}</div></>}<div className="smc-detail-section"><h3>Activity</h3><div className="smc-comment"><div className="smc-comment-av" style={{ background: "#279491" }}>RK</div><div className="smc-comment-body"><div className="smc-comment-head"><span className="nm">Ritesh Kapoor</span><span className="tm">{ago(drawerIssue.created_at)}</span></div><div className="smc-comment-text">Created this issue{drawerIssue.assigned_to ? ` and assigned to ${drawerIssue.assigned_to}` : ""}</div></div></div></div></div><div className="smc-composer"><textarea placeholder="Add a comment… @ to mention teammates" /><div className="smc-composer-bar"><button className="smc-btn smc-btn-p" style={{ fontSize: 11, padding: "5px 14px" }}>Send</button></div></div></>}</div>

    <div className={`smc-modal-bg ${showModal ? "open" : ""}`} onClick={() => !saving && setShowModal(false)}><form className="smc-modal" onSubmit={handleModalSubmit} onClick={(e) => e.stopPropagation()}><div className="smc-modal-head"><h2>{editIssue.id ? "Edit Issue" : "New Issue"}</h2><button type="button" className="xbtn" onClick={() => setShowModal(false)}>✕</button></div><div className="smc-modal-body"><div>{saveError && <div className="smc-form-error">{saveError}</div>}<div className="smc-fg"><label>Title</label><input name="title" type="text" required defaultValue={editIssue.title ?? ""} placeholder="Issue title…" style={{ fontSize: 16, fontWeight: 500 }} /></div><div className="smc-fg"><label>Description</label><textarea name="description" defaultValue={editIssue.description ?? ""} placeholder="Describe the issue in detail. Supports markdown." /></div><div className="smc-fg"><label>Attachments</label><input ref={fileInputRef} type="file" multiple style={{ display: "none" }} onChange={onSelectFiles} /><div onDragOver={(e) => e.preventDefault()} onDrop={onDrop} onClick={() => fileInputRef.current?.click()} style={{ border: "1px dashed #94a3b8", borderRadius: 10, padding: 18, cursor: "pointer", background: "#f8fafc", color: "#475569", fontSize: 12 }}><strong>Drop files here or click to upload</strong><br /><span>Supports images, PDFs, documents</span>{uploading && <span style={{ marginLeft: 8, color: "#279491" }}>Uploading…</span>}</div>{attachments.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{attachments.map((attachment) => <span key={attachment.url} className="smc-chip">{fileIcon(attachment)} {attachment.name}<button type="button" onClick={(e) => { e.stopPropagation(); setAttachments((prev) => prev.filter((item) => item.url !== attachment.url)); }} style={{ marginLeft: 6, border: 0, background: "transparent", cursor: "pointer" }}>×</button></span>)}</div>}</div><div className="smc-sec-div">Acceptance & Testing</div><div className="smc-fg"><label>Acceptance Criteria</label><textarea name="acceptance_criteria" style={{ minHeight: 60 }} defaultValue={editIssue.acceptance_criteria ?? ""} /></div><div className="smc-fg"><label>Regression Test</label><textarea name="regression_test" style={{ minHeight: 50 }} defaultValue={editIssue.regression_test ?? ""} /></div><div className="smc-fg"><label>Steps to Reproduce</label><textarea name="steps_to_reproduce" style={{ minHeight: 60 }} defaultValue={editIssue.steps_to_reproduce ?? ""} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div className="smc-fg"><label>Expected Behavior</label><textarea name="expected_behavior" style={{ minHeight: 50 }} defaultValue={editIssue.expected_behavior ?? ""} /></div><div className="smc-fg"><label>Actual Behavior</label><textarea name="actual_behavior" style={{ minHeight: 50 }} defaultValue={editIssue.actual_behavior ?? ""} /></div></div><div className="smc-fg"><label>Git Branch</label><input name="git_branch" type="text" defaultValue={editIssue.git_branch ?? ""} placeholder="fix/branch-name" /></div><div className="smc-fg"><label>Fix Applied</label><textarea name="fix_applied" style={{ minHeight: 50 }} defaultValue={editIssue.fix_applied ?? ""} /></div></div><div className="smc-meta-panel"><div className="smc-fg"><label>Status</label><select name="status" defaultValue={editIssue.status ?? "Open"}><option>Open</option><option>In Progress</option><option>In Review</option><option>Blocked</option><option>Resolved</option><option>Deferred</option><option>{"Won't Fix"}</option></select></div><div className="smc-fg"><label>Type</label><select name="issue_type" defaultValue={editIssue.issue_type ?? "Bug"}><option>Bug</option><option>Feature</option><option>Enhancement</option><option>Docs</option><option>DevOps</option><option>UX</option><option>Task</option><option>Test</option></select></div><div className="smc-fg"><label>Severity</label><select name="severity" defaultValue={editIssue.severity ?? "Medium"}><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select></div><div className="smc-fg"><label>Priority</label><select name="priority" defaultValue={editIssue.priority ?? "P2"}><option value="P0">P0 — Urgent</option><option value="P1">P1 — High</option><option value="P2">P2 — Medium</option><option value="P3">P3 — Low</option></select></div><div className="smc-fg"><label>Assignee</label><select name="assigned_to" defaultValue={editIssue.assigned_to ?? ""}><option value="">Unassigned</option><option>Ritesh Kapoor</option><option>Kumar Mayank</option><option>Ankush Arya</option><option>OpenAI</option></select></div><div className="smc-fg"><label>Reporter</label><select name="reporter_name" defaultValue={editIssue.reporter_name ?? "Ritesh Kapoor"}><option>Ritesh Kapoor</option><option>Kumar Mayank</option><option>Ankush Arya</option><option>OpenAI</option></select></div><div className="smc-fg"><label>Sprint</label><select name="sprint_number" defaultValue={String(editIssue.sprint_number ?? 27)}><option>28</option><option>27</option><option>26</option><option>25</option><option>24</option><option>23</option></select></div><div className="smc-fg"><label>Story Points</label><select name="story_points" defaultValue={String(editIssue.story_points ?? "")}><option value="">—</option><option>1</option><option>2</option><option>3</option><option>5</option><option>8</option><option>13</option><option>21</option></select></div><div className="smc-fg"><label>Area / Module</label><input name="area" defaultValue={editIssue.area ?? ""} placeholder="SMC Issues" /></div><div className="smc-fg"><label>Environment</label><select name="environment" defaultValue={editIssue.environment ?? "Production"}><option>Production</option><option>Staging</option><option>Development</option><option>All</option></select></div><div className="smc-fg"><label>Customer Impact</label><select name="customer_impact" defaultValue={editIssue.customer_impact ?? "none"}><option value="none">None</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div><div className="smc-fg"><label>Target Date</label><input name="target_date" type="date" defaultValue={editIssue.target_date ?? ""} /></div></div></div><div className="smc-modal-foot"><button type="button" className="smc-btn" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button><button className="smc-btn smc-btn-p" type="submit" disabled={saving || uploading}>{saving ? "Saving…" : editIssue.id ? "Update Issue" : "Create Issue"}</button></div></form></div>
  </>;
}

export default function SmcIssuesPage() {
  return <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#94a3b8" }}>Loading issues…</div>}><SmcIssuesContent /></Suspense>;
}
