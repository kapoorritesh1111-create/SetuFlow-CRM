"use client";
import {
  useEffect,
  useState,
  useMemo,
  useCallback,
  Suspense,
  useRef,
  type FormEvent,
} from "react";
import { useSearchParams } from "next/navigation";

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
};
type SortKey = keyof Pick<
  Issue,
  | "issue_ref"
  | "title"
  | "status"
  | "severity"
  | "area"
  | "sprint_number"
  | "story_points"
  | "assigned_to"
  | "reporter_name"
  | "created_at"
  | "issue_type"
>;
type SortDir = "asc" | "desc";
const COLS = [
  { key: "issue_ref", label: "Ref", on: true },
  { key: "title", label: "Title", on: true },
  { key: "severity", label: "Severity", on: true },
  { key: "area", label: "Area", on: true },
  { key: "status", label: "Status", on: true },
  { key: "issue_type", label: "Type", on: true },
  { key: "story_points", label: "Pts", on: true },
  { key: "assigned_to", label: "Assignee", on: true },
  { key: "reporter_name", label: "Reporter", on: false },
  { key: "sprint_number", label: "Sprint", on: true },
  { key: "created_at", label: "Added", on: false },
  { key: "customer_impact", label: "Impact", on: false },
] as const;
const sevCls = (s: string | null) => {
  if (!s) return "low";
  const l = s.toLowerCase();
  return l.includes("critical")
    ? "critical"
    : l.includes("high")
      ? "high"
      : l.includes("medium")
        ? "medium"
        : "low";
};
const stCls = (s: string) => {
  const l = s.toLowerCase();
  return l === "resolved"
    ? "resolved"
    : l.includes("review")
      ? "review"
      : l.includes("progress")
        ? "in-progress"
        : l === "blocked"
          ? "blocked"
          : l === "deferred"
            ? "deferred"
            : "open";
};
const typCls = (t: string | null) => {
  if (!t) return "feat";
  const l = t.toLowerCase();
  return l.includes("bug")
    ? "bug"
    : l.includes("doc")
      ? "doc"
      : l.includes("ux")
        ? "ux"
        : l.includes("enh")
          ? "enhancement"
          : l.includes("test")
            ? "test"
            : l.includes("devops")
              ? "devops"
              : "feat";
};
const ini = (n: string | null) =>
  n
    ? n
        .split(" ")
        .map((w) => w[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "";
const ago = (d: string) => {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5);
  return days === 0
    ? "today"
    : days < 30
      ? `${days}d ago`
      : new Date(d).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
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

function SmcIssuesContent() {
  const searchParams = useSearchParams();
  const colPickerRef = useRef<HTMLDivElement>(null);
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
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [showCols, setShowCols] = useState(false);
  const [visCols, setVisCols] = useState<Set<string>>(
    new Set(COLS.filter((c) => c.on).map((c) => c.key)),
  );
  const [drawerIssue, setDrawerIssue] = useState<Issue | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editIssue, setEditIssue] = useState<Partial<Issue>>({});

  const refreshIssues = useCallback(async () => {
    const res = await fetch("/api/smc/issues?limit=1000", {
      cache: "no-store",
    });
    const data = await res.json();
    setIssues(data.issues ?? []);
  }, []);

  useEffect(() => {
    refreshIssues()
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [refreshIssues]);

  useEffect(() => {
    const type = searchParams.get("type");
    const sprint = searchParams.get("sprint");
    const view = searchParams.get("view");
    const q = searchParams.get("q");
    setTypeFilter(type);
    setSprintFilter(
      sprint && Number.isFinite(Number(sprint)) ? Number(sprint) : null,
    );
    setViewFilter(view);
    if (q) setSearch(q);
    setKpiF(null);
    setSel(new Set());
  }, [searchParams]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        colPickerRef.current &&
        !colPickerRef.current.contains(e.target as Node)
      )
        setShowCols(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // S27-ENH-011: Esc closes drawer and modal
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showModal) { setShowModal(false); return; }
        if (drawerIssue) { setDrawerIssue(null); return; }
        setShowCols(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showModal, drawerIssue]);

  const counts = useMemo(() => {
    const a = issues;
    return {
      total: a.length,
      open: a.filter((i) => i.status === "Open" || i.status === "open").length,
      critical: a.filter((i) => i.severity?.toLowerCase().includes("critical"))
        .length,
      high: a.filter((i) => i.severity?.toLowerCase().includes("high")).length,
      inProgress: a.filter((i) => i.status.toLowerCase().includes("progress"))
        .length,
      resolved: a.filter((i) => i.status === "Resolved").length,
      deferred: a.filter((i) => i.status === "Deferred").length,
      blocked: a.filter((i) => i.status.toLowerCase() === "blocked").length,
    };
  }, [issues]);

  const filtered = useMemo(() => {
    let list = [...issues];
    if (typeFilter) {
      const q = typeFilter.toLowerCase();
      list = list.filter(
        (i) => (i.issue_type ?? i.issue_category ?? "").toLowerCase() === q,
      );
    }
    if (sprintFilter !== null)
      list = list.filter((i) => Number(i.sprint_number) === sprintFilter);
    if (viewFilter === "backlog")
      list = list.filter(
        (i) =>
          !["resolved", "deferred"].includes(i.status.toLowerCase()) &&
          Number(i.sprint_number) < 27,
      );
    if (hideRes && kpiF !== "resolved")
      list = list.filter((i) => i.status !== "Resolved");
    if (hideDef && kpiF !== "deferred")
      list = list.filter((i) => i.status !== "Deferred");
    if (kpiF === "open")
      list = list.filter((i) => i.status === "Open" || i.status === "open");
    if (kpiF === "critical")
      list = list.filter((i) => i.severity?.toLowerCase().includes("critical"));
    if (kpiF === "high")
      list = list.filter((i) => i.severity?.toLowerCase().includes("high"));
    if (kpiF === "progress")
      list = list.filter((i) => i.status.toLowerCase().includes("progress"));
    if (kpiF === "resolved")
      list = issues.filter((i) => i.status === "Resolved");
    if (kpiF === "deferred")
      list = issues.filter((i) => i.status === "Deferred");
    if (kpiF === "blocked")
      list = list.filter((i) => i.status.toLowerCase() === "blocked");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.issue_ref.toLowerCase().includes(q) ||
          (i.area ?? "").toLowerCase().includes(q) ||
          (i.assigned_to ?? "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : -String(av).localeCompare(String(bv));
    });
    return list;
  }, [
    issues,
    hideRes,
    hideDef,
    kpiF,
    search,
    sortKey,
    sortDir,
    typeFilter,
    sprintFilter,
    viewFilter,
  ]);

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };
  const toggleKpi = (k: string) => setKpiF((v) => (v === k ? null : k));
  const toggleCol = (k: string) =>
    setVisCols((p) => {
      const s = new Set(p);
      s.has(k) ? s.delete(k) : s.add(k);
      return s;
    });
  const clearSavedView = () => {
    setTypeFilter(null);
    setSprintFilter(null);
    setViewFilter(null);
  };
  const SA = ({ k }: { k: SortKey }) => (
    <span className="sort-arrow">
      {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
    </span>
  );

  const handleModalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setSaveError(null);
    const form = new FormData(event.currentTarget);
    const title = emptyToNull(form.get("title"));
    if (!title) {
      setSaveError("Title is required.");
      setSaving(false);
      return;
    }
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
    };
    try {
      const url = editIssue.id
        ? `/api/smc/issues/${editIssue.id}`
        : "/api/smc/issues";
      const method = editIssue.id ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(
          typeof data.error === "string" ? data.error : "Issue save failed.",
        );
      await refreshIssues();
      setShowModal(false);
      setEditIssue({});
      setDrawerIssue((data.issue ?? null) as Issue | null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Issue save failed.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#94a3b8",
        }}
      >
        Loading issues…
      </div>
    );

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Engineering</div>
          <h1>Issues</h1>
        </div>
        <div className="ha">
          {sel.size > 0 && (
            <span
              style={{
                fontSize: 11,
                color: "#279491",
                fontWeight: 600,
                padding: "6px 0",
              }}
            >
              {sel.size} selected
            </span>
          )}
          <div className="smc-col-picker" ref={colPickerRef}>
            <button className="smc-btn" onClick={() => setShowCols(!showCols)}>
              Columns
            </button>
            {showCols && (
              <div className="smc-col-menu">
                {COLS.map((c) => (
                  <label key={c.key} className="smc-col-item">
                    <input
                      type="checkbox"
                      checked={visCols.has(c.key)}
                      onChange={() => toggleCol(c.key)}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button
            className="smc-btn smc-btn-p"
            onClick={() => {
              setEditIssue({});
              setSaveError(null);
              setShowModal(true);
            }}
          >
            + New Issue
          </button>
        </div>
      </div>

      <div className="smc-kr">
        {[
          { k: "", v: counts.total, l: "Total", c: "" },
          { k: "open", v: counts.open, l: "Open", c: "amber" },
          { k: "critical", v: counts.critical, l: "Critical", c: "red" },
          { k: "high", v: counts.high, l: "High", c: "amber" },
          { k: "progress", v: counts.inProgress, l: "In Progress", c: "teal" },
          { k: "resolved", v: counts.resolved, l: "Done", c: "green" },
          { k: "deferred", v: counts.deferred, l: "Deferred", c: "" },
        ].map((kp) => (
          <div
            key={kp.l}
            className={`smc-kp ${kpiF === kp.k ? "filter-active" : kp.c}`}
            onClick={() => kp.k && toggleKpi(kp.k)}
          >
            <div className="v">{kp.v}</div>
            <div className="l">{kp.l}</div>
          </div>
        ))}
      </div>

      <div className="smc-tl">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search issues…"
          style={{
            border: "1px solid #e2e8f0",
            borderRadius: 6,
            padding: "5px 12px",
            fontSize: 12,
            width: 260,
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        {(typeFilter || sprintFilter !== null || viewFilter) && (
          <button className="smc-chip active" onClick={clearSavedView}>
            {typeFilter ??
              (sprintFilter !== null
                ? `Sprint ${sprintFilter}`
                : viewFilter)}{" "}
            ✕
          </button>
        )}
        <div className="smc-sp" />
        <button
          className={`smc-chip ${hideRes ? "hide-active" : ""}`}
          onClick={() => {
            setHideRes(!hideRes);
            setKpiF(null);
          }}
        >
          {hideRes ? "Hiding resolved" : "Show resolved"}
        </button>
        <button
          className={`smc-chip ${hideDef ? "hide-active" : ""}`}
          onClick={() => {
            setHideDef(!hideDef);
            setKpiF(null);
          }}
        >
          {hideDef ? "Hiding deferred" : "Show deferred"}
        </button>
        <span
          style={{
            fontSize: 11,
            color: "#64748b",
            fontFamily: "'DM Mono',monospace",
          }}
        >
          {filtered.length} issues
        </span>
      </div>

      {/* S27-ENH-008: Bulk action bar */}
      {sel.size > 0 && (
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 24px',background:'#e6f5f4',borderBottom:'1px solid #279491',flexShrink:0}}>
          <span style={{fontSize:12,fontWeight:600,color:'#279491'}}>{sel.size} selected</span>
          <select style={{border:'1px solid #279491',borderRadius:6,padding:'4px 8px',fontSize:11,fontFamily:'inherit',background:'#fff',color:'#1e293b'}}
            defaultValue="" onChange={async(e)=>{
              if(!e.target.value)return;
              const ids=Array.from(sel);
              await fetch('/api/smc/issues/bulk',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,updates:{status:e.target.value}})});
              await refreshIssues();setSel(new Set());e.target.value='';
            }}>
            <option value="" disabled>Change status…</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="In Review">In Review</option>
            <option value="Blocked">Blocked</option>
            <option value="Resolved">Resolved</option>
            <option value="Deferred">Deferred</option>
          </select>
          <select style={{border:'1px solid #279491',borderRadius:6,padding:'4px 8px',fontSize:11,fontFamily:'inherit',background:'#fff',color:'#1e293b'}}
            defaultValue="" onChange={async(e)=>{
              if(!e.target.value)return;
              const ids=Array.from(sel);
              await fetch('/api/smc/issues/bulk',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids,updates:{assigned_to:e.target.value}})});
              await refreshIssues();setSel(new Set());e.target.value='';
            }}>
            <option value="" disabled>Assign to…</option>
            <option value="Ritesh Kapoor">Ritesh Kapoor</option>
            <option value="Kumar Mayank">Kumar Mayank</option>
            <option value="Ankush Arya">Ankush Arya</option>
          </select>
          <button className="smc-btn" style={{fontSize:10,padding:'3px 8px'}} onClick={()=>setSel(new Set())}>Clear selection</button>
        </div>
      )}

      <div className="smc-cs">
        <table className="smc-it">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={sel.size === filtered.length && filtered.length > 0}
                  onChange={() =>
                    setSel((p) =>
                      p.size === filtered.length
                        ? new Set()
                        : new Set(filtered.map((i) => i.id)),
                    )
                  }
                />
              </th>
              {visCols.has("issue_ref") && (
                <th
                  className={sortKey === "issue_ref" ? "sorted" : ""}
                  onClick={() => handleSort("issue_ref")}
                >
                  Ref <SA k="issue_ref" />
                </th>
              )}
              {visCols.has("title") && (
                <th
                  className={sortKey === "title" ? "sorted" : ""}
                  onClick={() => handleSort("title")}
                >
                  Title <SA k="title" />
                </th>
              )}
              {visCols.has("severity") && (
                <th
                  className={sortKey === "severity" ? "sorted" : ""}
                  onClick={() => handleSort("severity")}
                  style={{ width: 80 }}
                >
                  Severity <SA k="severity" />
                </th>
              )}
              {visCols.has("area") && (
                <th
                  className={sortKey === "area" ? "sorted" : ""}
                  onClick={() => handleSort("area")}
                  style={{ width: 100 }}
                >
                  Area <SA k="area" />
                </th>
              )}
              {visCols.has("status") && (
                <th
                  className={sortKey === "status" ? "sorted" : ""}
                  onClick={() => handleSort("status")}
                  style={{ width: 90 }}
                >
                  Status <SA k="status" />
                </th>
              )}
              {visCols.has("issue_type") && (
                <th
                  className={sortKey === "issue_type" ? "sorted" : ""}
                  onClick={() => handleSort("issue_type")}
                  style={{ width: 90 }}
                >
                  Type <SA k="issue_type" />
                </th>
              )}
              {visCols.has("story_points") && (
                <th
                  className={sortKey === "story_points" ? "sorted" : ""}
                  onClick={() => handleSort("story_points")}
                  style={{ width: 50 }}
                >
                  Pts <SA k="story_points" />
                </th>
              )}
              {visCols.has("assigned_to") && (
                <th
                  className={sortKey === "assigned_to" ? "sorted" : ""}
                  onClick={() => handleSort("assigned_to")}
                  style={{ width: 90 }}
                >
                  Assignee <SA k="assigned_to" />
                </th>
              )}
              {visCols.has("reporter_name") && (
                <th style={{ width: 80 }}>Reporter</th>
              )}
              {visCols.has("sprint_number") && (
                <th
                  className={sortKey === "sprint_number" ? "sorted" : ""}
                  onClick={() => handleSort("sprint_number")}
                  style={{ width: 60 }}
                >
                  Sprint <SA k="sprint_number" />
                </th>
              )}
              {visCols.has("created_at") && (
                <th
                  className={sortKey === "created_at" ? "sorted" : ""}
                  onClick={() => handleSort("created_at")}
                >
                  Added <SA k="created_at" />
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.map((issue) => (
              <tr
                key={issue.id}
                className={sel.has(issue.id) ? "selected" : ""}
                onClick={() => setDrawerIssue(issue)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={sel.has(issue.id)}
                    onChange={() =>
                      setSel((p) => {
                        const s = new Set(p);
                        s.has(issue.id) ? s.delete(issue.id) : s.add(issue.id);
                        return s;
                      })
                    }
                  />
                </td>
                {visCols.has("issue_ref") && (
                  <td>
                    <span className="smc-iref">{issue.issue_ref}</span>
                  </td>
                )}
                {visCols.has("title") && (
                  <td>
                    <div className="smc-itc">
                      <div className={`smc-pd ${sevCls(issue.severity)}`} />
                      <span className="smc-itn">{issue.title}</span>
                    </div>
                  </td>
                )}
                {visCols.has("severity") && (
                  <td>
                    <span
                      className={`smc-lb ${sevCls(issue.severity)}`}
                      style={
                        sevCls(issue.severity) === "critical"
                          ? { background: "#fef2f2", color: "#ef4444" }
                          : sevCls(issue.severity) === "high"
                            ? { background: "#fef3c7", color: "#d97706" }
                            : sevCls(issue.severity) === "medium"
                              ? {
                                  background: "rgba(6,182,212,.1)",
                                  color: "#06b6d4",
                                }
                              : { background: "#f1f5f9", color: "#94a3b8" }
                      }
                    >
                      {issue.severity ?? "Low"}
                    </span>
                  </td>
                )}
                {visCols.has("area") && (
                  <td style={{ fontSize: 11.5, color: "#475569" }}>
                    {issue.area ?? "—"}
                  </td>
                )}
                {visCols.has("status") && (
                  <td>
                    <span className={`smc-st ${stCls(issue.status)}`}>
                      {issue.status}
                    </span>
                  </td>
                )}
                {visCols.has("issue_type") && (
                  <td>
                    <span className={`smc-lb ${typCls(issue.issue_type)}`}>
                      {issue.issue_type ?? issue.issue_category ?? "Task"}
                    </span>
                  </td>
                )}
                {visCols.has("story_points") && (
                  <td className="smc-pts">{issue.story_points ?? "—"}</td>
                )}
                {visCols.has("assigned_to") && (
                  <td>
                    {issue.assigned_to ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                        }}
                      >
                        <div
                          className="smc-aa"
                          style={{ background: "#279491" }}
                        >
                          {ini(issue.assigned_to)}
                        </div>
                        <span style={{ fontSize: 11, color: "#475569" }}>
                          {issue.assigned_to.split(" ")[0]}
                        </span>
                      </div>
                    ) : null}
                  </td>
                )}
                {visCols.has("reporter_name") && (
                  <td style={{ fontSize: 11, color: "#64748b" }}>
                    {issue.reporter_name ?? "—"}
                  </td>
                )}
                {visCols.has("sprint_number") && (
                  <td className="smc-pts">{issue.sprint_number}</td>
                )}
                {visCols.has("created_at") && (
                  <td
                    style={{
                      fontSize: 10.5,
                      color: "#94a3b8",
                      fontFamily: "'DM Mono',monospace",
                    }}
                  >
                    {ago(issue.created_at)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={`smc-drawer-bg ${drawerIssue ? "open" : ""}`}
        onClick={() => setDrawerIssue(null)}
      />
      <div className={`smc-drawer ${drawerIssue ? "open" : ""}`}>
        {drawerIssue && (
          <>
            <div className="smc-drawer-head">
              <button className="xbtn" onClick={() => setDrawerIssue(null)}>
                ✕
              </button>
              <span className="smc-iref" style={{ fontSize: 12 }}>
                {drawerIssue.issue_ref}
              </span>
              <span className={`smc-lb ${typCls(drawerIssue.issue_type)}`}>
                {drawerIssue.issue_type ?? "Task"}
              </span>
              <span className={`smc-st ${stCls(drawerIssue.status)}`}>
                {drawerIssue.status}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                <button
                  className="smc-btn"
                  style={{ fontSize: 10, padding: "3px 8px" }}
                  onClick={() => {
                    setEditIssue(drawerIssue);
                    setSaveError(null);
                    setShowModal(true);
                    setDrawerIssue(null);
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
            <div className="smc-drawer-body">
              <h2>{drawerIssue.title}</h2>
              <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>
                Created by {drawerIssue.reporter_name ?? "Unknown"} · Sprint{" "}
                {drawerIssue.sprint_number}
                {drawerIssue.story_points
                  ? ` · ${drawerIssue.story_points} pts`
                  : ""}
              </p>
              <div className="smc-detail-meta">
                <span className="ml">Status</span>
                <span className="mv">
                  <span className={`smc-st ${stCls(drawerIssue.status)}`}>
                    {drawerIssue.status}
                  </span>
                </span>
                <span className="ml">Severity</span>
                <span className="mv">{drawerIssue.severity ?? "—"}</span>
                <span className="ml">Priority</span>
                <span className="mv">{drawerIssue.priority ?? "—"}</span>
                <span className="ml">Assignee</span>
                <span className="mv">
                  {drawerIssue.assigned_to ?? "Unassigned"}
                </span>
                <span className="ml">Area</span>
                <span className="mv">{drawerIssue.area ?? "—"}</span>
                <span className="ml">Environment</span>
                <span className="mv">
                  {drawerIssue.environment ?? "Production"}
                </span>
                <span className="ml">Impact</span>
                <span className="mv">{drawerIssue.customer_impact ?? "—"}</span>
                {drawerIssue.target_date && (
                  <>
                    <span className="ml">Target</span>
                    <span className="mv">{drawerIssue.target_date}</span>
                  </>
                )}
                {drawerIssue.git_branch && (
                  <>
                    <span className="ml">Branch</span>
                    <span
                      className="mv"
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 11,
                        color: "#279491",
                      }}
                    >
                      {drawerIssue.git_branch}
                    </span>
                  </>
                )}
              </div>
              {drawerIssue.description && (
                <div className="smc-detail-desc">{drawerIssue.description}</div>
              )}
              {drawerIssue.steps_to_reproduce && (
                <>
                  <div className="smc-detail-section">
                    <h3>Steps to Reproduce</h3>
                  </div>
                  <div className="smc-detail-desc">
                    {drawerIssue.steps_to_reproduce}
                  </div>
                </>
              )}
              {drawerIssue.fix_applied && (
                <>
                  <div className="smc-detail-section">
                    <h3>Fix Applied</h3>
                  </div>
                  <div className="smc-detail-desc">
                    {drawerIssue.fix_applied}
                  </div>
                </>
              )}
              {drawerIssue.regression_test && (
                <>
                  <div className="smc-detail-section">
                    <h3>Regression Test</h3>
                  </div>
                  <div className="smc-detail-desc">
                    {drawerIssue.regression_test}
                  </div>
                </>
              )}
              {drawerIssue.files_changed &&
                drawerIssue.files_changed.length > 0 && (
                  <div className="smc-detail-section">
                    <h3>Files Changed</h3>
                    {drawerIssue.files_changed.map((f, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block",
                          padding: "3px 8px",
                          background: "#f1f5f9",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "'DM Mono',monospace",
                          margin: "2px 4px 2px 0",
                          color: "#475569",
                        }}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              <div className="smc-detail-section">
                <h3>Activity</h3>
                <div className="smc-comment">
                  <div
                    className="smc-comment-av"
                    style={{ background: "#279491" }}
                  >
                    RK
                  </div>
                  <div className="smc-comment-body">
                    <div className="smc-comment-head">
                      <span className="nm">Ritesh Kapoor</span>
                      <span className="tm">{ago(drawerIssue.created_at)}</span>
                    </div>
                    <div className="smc-comment-text">
                      Created this issue
                      {drawerIssue.assigned_to
                        ? ` and assigned to ${drawerIssue.assigned_to}`
                        : ""}
                    </div>
                  </div>
                </div>
                {drawerIssue.resolved_at && (
                  <div className="smc-comment">
                    <div
                      className="smc-comment-av"
                      style={{ background: "#10b981" }}
                    >
                      ✓
                    </div>
                    <div className="smc-comment-body">
                      <div className="smc-comment-head">
                        <span className="nm">System</span>
                        <span className="tm">
                          {ago(drawerIssue.resolved_at)}
                        </span>
                      </div>
                      <div className="smc-comment-text">
                        Issue resolved
                        {drawerIssue.fix_applied
                          ? `: ${drawerIssue.fix_applied.slice(0, 120)}…`
                          : ""}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="smc-composer">
              <textarea placeholder="Add a comment… @ to mention teammates" />
              <div className="smc-composer-bar">
                <button
                  className="smc-btn smc-btn-p"
                  style={{ fontSize: 11, padding: "5px 14px" }}
                >
                  Send
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div
        className={`smc-modal-bg ${showModal ? "open" : ""}`}
        onClick={() => !saving && setShowModal(false)}
      >
        <form
          className="smc-modal"
          onSubmit={handleModalSubmit}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="smc-modal-head">
            <h2>{editIssue.id ? "Edit Issue" : "New Issue"}</h2>
            <button
              type="button"
              className="xbtn"
              onClick={() => setShowModal(false)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: "none",
                background: "none",
                cursor: "pointer",
                color: "#64748b",
                fontSize: 18,
              }}
            >
              ✕
            </button>
          </div>
          <div className="smc-modal-body">
            <div>
              {saveError && <div className="smc-form-error">{saveError}</div>}
              <div className="smc-fg">
                <label>Title</label>
                <input
                  name="title"
                  type="text"
                  required
                  defaultValue={editIssue.title ?? ""}
                  placeholder="Issue title…"
                  style={{ fontSize: 16, fontWeight: 500 }}
                />
              </div>
              <div className="smc-fg">
                <label>Description</label>
                <textarea
                  name="description"
                  defaultValue={editIssue.description ?? ""}
                  placeholder="Describe the issue in detail. Supports markdown."
                />
              </div>
              <div className="smc-sec-div">Acceptance & Testing</div>
              <div className="smc-fg">
                <label>Acceptance Criteria</label>
                <textarea
                  name="acceptance_criteria"
                  style={{ minHeight: 60 }}
                  defaultValue={editIssue.acceptance_criteria ?? ""}
                  placeholder="What must be true for this to be done?"
                />
              </div>
              <div className="smc-fg">
                <label>Regression Test</label>
                <textarea
                  name="regression_test"
                  style={{ minHeight: 50 }}
                  defaultValue={editIssue.regression_test ?? ""}
                  placeholder="How to verify this doesn't break existing behavior"
                />
              </div>
              <div className="smc-sec-div">Details</div>
              <div className="smc-fg">
                <label>Steps to Reproduce</label>
                <textarea
                  name="steps_to_reproduce"
                  style={{ minHeight: 60 }}
                  defaultValue={editIssue.steps_to_reproduce ?? ""}
                  placeholder="1. Go to…"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <div className="smc-fg">
                  <label>Expected Behavior</label>
                  <textarea
                    name="expected_behavior"
                    style={{ minHeight: 50 }}
                    defaultValue={editIssue.expected_behavior ?? ""}
                  />
                </div>
                <div className="smc-fg">
                  <label>Actual Behavior</label>
                  <textarea
                    name="actual_behavior"
                    style={{ minHeight: 50 }}
                    defaultValue={editIssue.actual_behavior ?? ""}
                  />
                </div>
              </div>
              <div className="smc-fg">
                <label>Git Branch</label>
                <input
                  name="git_branch"
                  type="text"
                  defaultValue={editIssue.git_branch ?? ""}
                  placeholder="fix/branch-name"
                />
              </div>
              <div className="smc-fg">
                <label>Fix Applied</label>
                <textarea
                  name="fix_applied"
                  style={{ minHeight: 50 }}
                  defaultValue={editIssue.fix_applied ?? ""}
                  placeholder="Description of the fix once resolved"
                />
              </div>
            </div>
            <div className="smc-meta-panel">
              <div className="smc-fg">
                <label>Status</label>
                <select name="status" defaultValue={editIssue.status ?? "Open"}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>In Review</option>
                  <option>Blocked</option>
                  <option>Resolved</option>
                  <option>Deferred</option>
                  <option>{"Won't Fix"}</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Type</label>
                <select
                  name="issue_type"
                  defaultValue={editIssue.issue_type ?? "Bug"}
                >
                  <option>Bug</option>
                  <option>Feature</option>
                  <option>Enhancement</option>
                  <option>Docs</option>
                  <option>DevOps</option>
                  <option>UX</option>
                  <option>Task</option>
                  <option>Test</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Severity</label>
                <select
                  name="severity"
                  defaultValue={editIssue.severity ?? "Medium"}
                >
                  <option>Critical</option>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Priority</label>
                <select
                  name="priority"
                  defaultValue={editIssue.priority ?? "P2"}
                >
                  <option value="P0">P0 — Urgent</option>
                  <option value="P1">P1 — High</option>
                  <option value="P2">P2 — Medium</option>
                  <option value="P3">P3 — Low</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Assignee</label>
                <select
                  name="assigned_to"
                  defaultValue={editIssue.assigned_to ?? ""}
                >
                  <option value="">Unassigned</option>
                  <option>Ritesh Kapoor</option>
                  <option>Kumar Mayank</option>
                  <option>Ankush Arya</option>
                  <option>OpenAI</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Reporter</label>
                <select
                  name="reporter_name"
                  defaultValue={editIssue.reporter_name ?? "Ritesh Kapoor"}
                >
                  <option>Ritesh Kapoor</option>
                  <option>Kumar Mayank</option>
                  <option>Ankush Arya</option>
                  <option>OpenAI</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Sprint</label>
                <select
                  name="sprint_number"
                  defaultValue={String(editIssue.sprint_number ?? 27)}
                >
                  <option>27</option>
                  <option>26</option>
                  <option>25</option>
                  <option>24</option>
                  <option>23</option>
                  <option>22</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Story Points</label>
                <select
                  name="story_points"
                  defaultValue={String(editIssue.story_points ?? "")}
                >
                  <option value="">—</option>
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>5</option>
                  <option>8</option>
                  <option>13</option>
                  <option>21</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Area / Module</label>
                <select name="area" defaultValue={editIssue.area ?? ""}>
                  <option value="">None</option>
                  <option>SMC Shell</option>
                  <option>SMC Issues</option>
                  <option>SMC Protocol</option>
                  <option>Admin</option>
                  <option>Quotes</option>
                  <option>Orders</option>
                  <option>Leads</option>
                  <option>Setu Guru</option>
                  <option>Pipeline</option>
                  <option>Mobile</option>
                  <option>API</option>
                  <option>Workspace</option>
                  <option>Marketing</option>
                  <option>Pricing</option>
                  <option>Documents</option>
                  <option>Auth</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Environment</label>
                <select
                  name="environment"
                  defaultValue={editIssue.environment ?? "Production"}
                >
                  <option>Production</option>
                  <option>Staging</option>
                  <option>Development</option>
                  <option>All</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Customer Impact</label>
                <select
                  name="customer_impact"
                  defaultValue={editIssue.customer_impact ?? "none"}
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div className="smc-fg">
                <label>Target Date</label>
                <input
                  name="target_date"
                  type="date"
                  defaultValue={editIssue.target_date ?? ""}
                />
              </div>
            </div>
          </div>
          <div className="smc-modal-foot">
            <button
              type="button"
              className="smc-btn"
              onClick={() => setShowModal(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button className="smc-btn" type="submit" disabled={saving}>
              Save Draft
            </button>
            <button
              className="smc-btn smc-btn-p"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Saving…"
                : editIssue.id
                  ? "Update Issue"
                  : "Create Issue"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default function SmcIssuesPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#94a3b8",
          }}
        >
          Loading issues…
        </div>
      }
    >
      <SmcIssuesContent />
    </Suspense>
  );
}
