"use client";

import { useRef, useState } from "react";

// S36-MOBILE-363 / 364 / 365
// Mobile-only issues card list for /smc/issues. Renders at <=767px (smc-mobile.css hides the table).
// Reuses the page's data + inlinePatch via props; no separate data source.

export type MobileIssue = {
  id: string;
  issue_ref: string | null;
  title: string;
  severity: string | null;
  status: string;
  area: string | null;
  assigned_to: string | null;
  sprint_number: number;
};

type CreateFields = { title: string; severity: string; area: string | null; assigned_to: string | null; sprint_number: number };

type Props = {
  issues: MobileIssue[];
  statuses: string[];
  onOpen: (id: string) => void;
  onSetStatus: (id: string, status: string) => void;
  onCreate: (fields: CreateFields) => Promise<void> | void;
};

const ADVANCE = ["Open", "In Progress", "In Review", "Resolved"];
const sevCls = (s: string | null) => { const l = (s ?? "").toLowerCase(); return l.includes("critical") ? "critical" : l.includes("high") ? "high" : l.includes("medium") ? "medium" : "low"; };
const stCls = (s: string) => { const l = s.toLowerCase(); return l === "resolved" ? "resolved" : l.includes("review") ? "review" : l.includes("progress") ? "in-progress" : l === "blocked" ? "blocked" : l === "deferred" ? "deferred" : "open"; };
const ini = (n: string | null) => n ? n.split(" ").map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() : "";
const nextStatus = (cur: string) => { const i = ADVANCE.indexOf(cur); if (i === -1) return "In Progress"; return i >= ADVANCE.length - 1 ? cur : ADVANCE[i + 1]; };

function parseQuickAdd(line: string): CreateFields {
  let rest = line;
  const sprintMatch = rest.match(/\bS(?:print)?\s?(\d{1,3})\b/i);
  const sprint_number = sprintMatch ? Number(sprintMatch[1]) : 36;
  if (sprintMatch) rest = rest.replace(sprintMatch[0], " ");
  const areas = ["chat", "quotes", "workspace", "docs", "leads", "orders", "admin", "catalog", "pricing"];
  let area: string | null = null;
  for (const a of areas) { const re = new RegExp(`\\b${a}\\b`, "i"); if (re.test(rest)) { area = a.charAt(0).toUpperCase() + a.slice(1); rest = rest.replace(re, " "); break; } }
  const sevMap: Record<string, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
  let severity = "Medium";
  for (const key of Object.keys(sevMap)) { const re = new RegExp(`\\b${key}\\b`, "i"); if (re.test(rest)) { severity = sevMap[key]; rest = rest.replace(re, " "); break; } }
  const asgMatch = rest.match(/\b(KM|AA|RK)\b/);
  const asgMap: Record<string, string> = { KM: "Kumar Mayank", AA: "Ankush Arya", RK: "Ritesh Kapoor" };
  const assigned_to = asgMatch ? asgMap[asgMatch[1]] : null;
  if (asgMatch) rest = rest.replace(asgMatch[0], " ");
  const title = rest.replace(/\s+/g, " ").trim() || "New SMC issue";
  return { title: title.charAt(0).toUpperCase() + title.slice(1), severity, area, assigned_to, sprint_number };
}

function Card({ issue, onOpen, onAdvance, onEdit }: { issue: MobileIssue; onOpen: () => void; onAdvance: () => void; onEdit: () => void }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const drag = useRef({ x0: 0, y0: 0, on: false, lock: "" as "" | "h" | "v", dx: 0 });

  const onDown = (e: React.PointerEvent) => { const d = drag.current; d.x0 = e.clientX; d.y0 = e.clientY; d.on = true; d.lock = ""; d.dx = 0; if (ref.current) ref.current.style.transition = "none"; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d.on) return;
    const mx = e.clientX - d.x0, my = e.clientY - d.y0;
    if (!d.lock) { if (Math.abs(mx) > Math.abs(my) + 5) { d.lock = "h"; (e.target as Element).setPointerCapture?.(e.pointerId); } else if (Math.abs(my) > 6) { d.lock = "v"; } }
    if (d.lock !== "h") return;
    e.preventDefault();
    d.dx = Math.max(-130, Math.min(130, mx));
    if (ref.current) ref.current.style.transform = `translateX(${d.dx}px)`;
  };
  const end = () => {
    const d = drag.current; if (!d.on) return; d.on = false;
    if (ref.current) ref.current.style.transition = "";
    if (d.lock === "h") {
      if (d.dx > 78) { if (ref.current) ref.current.style.transform = ""; onAdvance(); }
      else if (d.dx < -78) { if (ref.current) ref.current.style.transform = ""; onEdit(); }
      else if (ref.current) ref.current.style.transform = "";
    }
    d.lock = ""; d.dx = 0;
  };

  return (
    <div className="smc-mi-row">
      <div className="smc-mi-act smc-mi-act-l">Advance →</div>
      <div className="smc-mi-act smc-mi-act-r">← Edit</div>
      <div ref={ref} className="smc-mi-card" onClick={onOpen} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={end} onPointerCancel={end}>
        <div className={`smc-mi-sev ${sevCls(issue.severity)}`} />
        <div className="smc-mi-body">
          <div className="smc-mi-ref">{issue.issue_ref}</div>
          <div className="smc-mi-title">{issue.title}</div>
          <div className="smc-mi-meta">
            <button type="button" className={`smc-st ${stCls(issue.status)}`} onClick={(e) => { e.stopPropagation(); onEdit(); }}>{issue.status}</button>
            <span className={`smc-lb ${sevCls(issue.severity)}`}>{issue.severity ?? "Low"}</span>
            <span className="smc-mi-area">{issue.area ?? "—"}</span>
            {issue.assigned_to ? <span className="smc-mi-av">{ini(issue.assigned_to)}</span> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SmcMobileIssues({ issues, statuses, onOpen, onSetStatus, onCreate }: Props) {
  const [editId, setEditId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [line, setLine] = useState("");
  const editing = issues.find((i) => i.id === editId) ?? null;

  const submitAdd = async () => {
    if (!line.trim()) { setAdding(false); return; }
    await onCreate(parseQuickAdd(line));
    setLine(""); setAdding(false);
  };

  return (
    <div className="smc-issues-mobile">
      <div className="smc-mi-hint">Swipe → advance · ← edit · tap status to change</div>

      {issues.map((issue) => (
        <Card
          key={issue.id}
          issue={issue}
          onOpen={() => onOpen(issue.id)}
          onAdvance={() => onSetStatus(issue.id, nextStatus(issue.status))}
          onEdit={() => setEditId(issue.id)}
        />
      ))}
      {issues.length === 0 ? <div className="smc-mi-empty">No issues match the current filters.</div> : null}

      <button type="button" className="smc-mi-fab" onClick={() => setAdding(true)} aria-label="Quick add issue">+</button>

      {/* quick-add sheet */}
      <div className={`smc-msheet-scrim ${adding ? "open" : ""}`} onClick={() => setAdding(false)} />
      <div className={`smc-msheet ${adding ? "open" : ""}`} role="dialog" aria-label="Quick add">
        <div className="smc-msheet-grab" />
        <h3 className="smc-mi-sheet-h">New issue</h3>
        <p className="smc-mi-sheet-d">One line — parses sprint, area, severity (critical/high/medium/low) and assignee (KM/AA/RK).</p>
        <input className="smc-mi-input" value={line} onChange={(e) => setLine(e.target.value)} placeholder="e.g. S36 chat presence leak critical KM" autoFocus={adding} />
        <button type="button" className="smc-mi-create" onClick={submitAdd}>Create issue</button>
      </div>

      {/* quick status sheet */}
      <div className={`smc-msheet-scrim ${editing ? "open" : ""}`} onClick={() => setEditId(null)} />
      <div className={`smc-msheet ${editing ? "open" : ""}`} role="dialog" aria-label="Set status">
        <div className="smc-msheet-grab" />
        <h3 className="smc-mi-sheet-h">{editing?.issue_ref}</h3>
        <p className="smc-mi-sheet-d">Set status</p>
        <div className="smc-mi-stwrap">
          {statuses.map((s) => (
            <button key={s} type="button" className={`smc-st ${stCls(s)} ${editing?.status === s ? "sel" : ""}`} onClick={() => { if (editing) onSetStatus(editing.id, s); setEditId(null); }}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
