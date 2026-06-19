import Link from "next/link";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/server";
import { INTERNAL_ORG_ID } from "@/lib/config/internal";
import { isFeatureEnabled } from "@/lib/flags/feature-flags";

export const dynamic = "force-dynamic";

const SETU_ORG = INTERNAL_ORG_ID;
const SEV_ORDER = ["Critical", "High", "Medium", "Low"] as const;
const SEV_COLOR: Record<string, string> = { Critical: "#ef4444", High: "#f59e0b", Medium: "#3aada9", Low: "#94a3b8" };

type IssueRow = { status: string; sprint_number: number | null; severity: string | null };
type LeadRow = { pipeline_stage: string | null };
type RecentIssue = { issue_ref: string; title: string; status: string; severity: string | null; updated_at: string };
type IncidentRow = { detected_at: string | null; resolved_at: string | null };

async function getStats() {
  const supabase = await createClient();
  const sb = supabase as any;
  const [issuesRes, leadsRes, orgsRes, incidentsRes, recentRes, suitesRes, casesRes, runsRes, sprintMetaRes] = await Promise.all([
    supabase.from("sprint_issues").select("status, sprint_number, severity").eq("organization_id", SETU_ORG),
    supabase.from("client_onboarding_requests").select("pipeline_stage"),
    supabase.from("organizations").select("id"),
    sb.from("smc_incidents").select("detected_at, resolved_at"),
    supabase.from("sprint_issues").select("issue_ref, title, status, severity, updated_at").eq("organization_id", SETU_ORG).order("updated_at", { ascending: false }).limit(6),
    sb.from("qa_test_suites").select("id"),
    sb.from("qa_test_cases").select("is_critical"),
    sb.from("qa_test_runs").select("id"),
    sb.from("sprint_meta").select("sprint_number").order("sprint_number", { ascending: false }).limit(1),
  ]);

  const issues = (issuesRes.data as IssueRow[]) ?? [];
  const leads = (leadsRes.data as LeadRow[]) ?? [];
  const incidents = (incidentsRes.data as IncidentRow[]) ?? [];
  const open = issues.filter((i) => !["Resolved", "Deferred"].includes(i.status));
  const latestSprint = (sprintMetaRes.data?.[0]?.sprint_number as number | undefined) ?? issues.reduce((m, i) => Math.max(m, i.sprint_number ?? 0), 0);

  // velocity: last 8 sprints, oldest -> newest
  const bySprint = new Map<number, { total: number; resolved: number }>();
  for (const i of issues) {
    if (i.sprint_number == null) continue;
    const e = bySprint.get(i.sprint_number) ?? { total: 0, resolved: 0 };
    e.total++; if (i.status === "Resolved") e.resolved++;
    bySprint.set(i.sprint_number, e);
  }
  const velocity = [...bySprint.entries()].sort((a, b) => a[0] - b[0]).slice(-8)
    .map(([sprint, v]) => ({ sprint, total: v.total, resolved: v.resolved }));

  const severity: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  for (const i of open) { const k = i.severity && severity[i.severity] !== undefined ? i.severity : "Low"; severity[k]++; }

  const stage = (s: string) => leads.filter((l) => (l.pipeline_stage ?? "").toLowerCase() === s).length;
  const cases = (casesRes.data as { is_critical: boolean }[]) ?? [];
  const durations = incidents.filter((i) => i.detected_at && i.resolved_at)
    .map((i) => (new Date(i.resolved_at as string).getTime() - new Date(i.detected_at as string).getTime()) / 3.6e6);

  return {
    open: open.length,
    resolved: issues.filter((i) => i.status === "Resolved").length,
    inProgress: issues.filter((i) => i.status === "in_progress").length,
    leadsTotal: leads.length,
    funnel: { pipeline: leads.length, trial: stage("trial"), negotiating: stage("negotiating"), converted: stage("converted") },
    clients: orgsRes.data?.length ?? 0,
    incidentsActive: incidents.filter((i) => !i.resolved_at).length,
    incidentsTotal: incidents.length,
    mttr: durations.length ? `${Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)}h` : null,
    sprint: latestSprint,
    velocity,
    severity,
    qa: { suites: (suitesRes.data ?? []).length, cases: cases.length, critical: cases.filter((c) => c.is_critical).length, runs: (runsRes.data ?? []).length },
    recent: (recentRes.data as RecentIssue[]) ?? [],
  };
}

function ago(d: string) { const days = Math.floor((Date.now() - new Date(d).getTime()) / 864e5); return days === 0 ? "today" : `${days}d ago`; }
function stPill(s: string): string { const l = s.toLowerCase(); return l === "resolved" ? "smc-st resolved" : l.includes("review") ? "smc-st in-progress" : l.includes("progress") ? "smc-st in-progress" : "smc-st open"; }

export default async function SmcDashboard() {
  const s = await getStats();
  const showRevenue = await isFeatureEnabled("revenue_dashboard", INTERNAL_ORG_ID);

  // velocity bar geometry
  const maxV = Math.max(1, ...s.velocity.map((v) => v.total));
  const BW = 30, GAP = 12, BASE = 96, H = 74;
  const sevTotal = Math.max(1, Object.values(s.severity).reduce((a, b) => a + b, 0));

  const card: CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 15 };
  const h3: CSSProperties = { fontSize: 13, fontWeight: 600, color: "#1e293b", display: "flex", justifyContent: "space-between", alignItems: "baseline" };
  const sub: CSSProperties = { fontSize: 11, color: "#64748b", fontWeight: 400 };
  const note: CSSProperties = { fontSize: 11, color: "#94a3b8", marginTop: 10 };

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Setu Mission Control</div><h1>Dashboard</h1><p>Live operational state — issues, sprint velocity, pipeline and quality.</p></div>
        <div className="ha"><span className="smc-st in-progress">Sprint {s.sprint}</span><a href="https://setuflowcrm.com/dashboard" target="_blank" rel="noopener" className="smc-btn">{"\u2197"} SaaS App</a></div>
      </div>

      <div className="smc-kr">
        <div className="smc-kp red"><div className="v">{s.open}</div><div className="l">Open Issues</div></div>
        <div className="smc-kp"><div className="v">{s.resolved}</div><div className="l">Resolved</div></div>
        <div className="smc-kp teal"><div className="v">{s.leadsTotal}</div><div className="l">Leads</div></div>
        <div className="smc-kp"><div className="v">{s.clients}</div><div className="l">Clients</div></div>
        <div className={`smc-kp ${s.incidentsActive ? "amber" : "green"}`}><div className="v">{s.incidentsActive}</div><div className="l">Incidents</div></div>
        <div className="smc-kp"><div className="v">{s.qa.suites}</div><div className="l">QA Suites</div></div>
      </div>

      <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 14 }}>
        {/* velocity */}
        <div style={{ ...card, gridColumn: "span 7" }}>
          <div style={h3}>Sprint velocity <span style={sub}>resolved vs scoped · last {s.velocity.length} sprints</span></div>
          <svg viewBox={`0 0 ${s.velocity.length * (BW + GAP)} 112`} width="100%" style={{ marginTop: 6 }}>
            {s.velocity.map((v, i) => {
              const x = i * (BW + GAP) + 2;
              const th = (v.total / maxV) * H, rh = (v.resolved / maxV) * H;
              return (
                <g key={v.sprint}>
                  <rect x={x} y={BASE - th} width={BW} height={th} rx={3} fill="#e2e8f0" />
                  <rect x={x} y={BASE - rh} width={BW} height={rh} rx={3} fill="#279491" />
                  <text x={x + BW / 2} y={BASE + 13} fontSize={8.5} fill="#94a3b8" textAnchor="middle" fontFamily="DM Mono">{v.sprint}</text>
                </g>
              );
            })}
          </svg>
          <div style={{ fontSize: 11, color: "#64748b", display: "flex", gap: 14, marginTop: 6 }}>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#279491", marginRight: 5 }} />Resolved</span>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: "#e2e8f0", marginRight: 5 }} />Scoped</span>
          </div>
        </div>

        {/* severity */}
        <div style={{ ...card, gridColumn: "span 5" }}>
          <div style={h3}>Open issues by severity <span style={sub}>{s.open} open</span></div>
          <div style={{ display: "flex", height: 11, borderRadius: 6, overflow: "hidden", margin: "14px 0 10px" }}>
            {SEV_ORDER.map((k) => s.severity[k] > 0 ? <div key={k} title={`${k}: ${s.severity[k]}`} style={{ width: `${(s.severity[k] / sevTotal) * 100}%`, background: SEV_COLOR[k] }} /> : null)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
            {SEV_ORDER.map((k) => <span key={k}><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, background: SEV_COLOR[k], marginRight: 5 }} />{k} <b style={{ fontFamily: "DM Mono" }}>{s.severity[k]}</b></span>)}
          </div>
          <div style={note}>{s.severity.Critical + s.severity.High} critical+high open — Sprint {s.sprint} focus list.</div>
        </div>

        {/* pipeline */}
        <div style={{ ...card, gridColumn: "span 4" }}>
          <div style={h3}>Lead pipeline</div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 7 }}>
            {([["Pipeline", s.funnel.pipeline, "#1f487c"], ["Trial", s.funnel.trial, "#3aada9"], ["Converted", s.funnel.converted, "#10b981"]] as [string, number, string][]).map(([k, n, c]) => (
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 74, fontSize: 11.5, color: "#475569" }}>{k}</span>
                <div style={{ flex: 1, height: 18, background: "#f1f5f9", borderRadius: 5, overflow: "hidden" }}><div style={{ height: "100%", width: `${s.funnel.pipeline ? (n / s.funnel.pipeline) * 100 : 0}%`, background: c, borderRadius: 5 }} /></div>
                <b style={{ fontFamily: "DM Mono", width: 18, textAlign: "right" }}>{n}</b>
              </div>
            ))}
          </div>
          <div style={note}>{s.funnel.trial} trialing · {s.funnel.converted} converted.</div>
        </div>

        {/* QA coverage */}
        <div style={{ ...card, gridColumn: "span 4" }}>
          <div style={h3}>Quality coverage <span style={sub}>authored suites</span></div>
          <div style={{ display: "flex", gap: 14, alignItems: "center", marginTop: 10 }}>
            <svg viewBox="0 0 120 120" width={100}>
              <circle cx={60} cy={60} r={46} fill="none" stroke="#eef2f7" strokeWidth={14} />
              <circle cx={60} cy={60} r={46} fill="none" stroke="#279491" strokeWidth={14} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 46} ${2 * Math.PI * 46}`} transform="rotate(-90 60 60)" />
              <text x={60} y={56} textAnchor="middle" fontSize={22} fontWeight={700} fill="#1f487c" fontFamily="DM Mono">{s.qa.suites}</text>
              <text x={60} y={72} textAnchor="middle" fontSize={9} fill="#94a3b8">suites</text>
            </svg>
            <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.9 }}>
              <div><b style={{ fontFamily: "DM Mono" }}>{s.qa.cases}</b> cases</div>
              <div><b style={{ fontFamily: "DM Mono" }}>{s.qa.critical}</b> critical-path</div>
              <div><span className={`smc-st ${s.qa.runs ? "resolved" : "open"}`}>{s.qa.runs ? `${s.qa.runs} runs` : "first run pending"}</span></div>
            </div>
          </div>
          <div style={note}>Suites are DB records — run them in QA.</div>
        </div>

        {/* system / revenue (flag-gated) */}
        <div style={{ ...card, gridColumn: "span 4" }}>
          <div style={h3}>System</div>
          <div style={{ marginTop: 8, fontSize: 12.5, display: "flex", flexDirection: "column", gap: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>App (Vercel)</span><span className="smc-st resolved">operational</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Database</span><span className="smc-st resolved">operational</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Active incidents</span><b style={{ fontFamily: "DM Mono" }}>{s.incidentsActive}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>MTTR</span><span style={{ color: s.mttr ? "#1e293b" : "#94a3b8" }}>{s.mttr ?? "no data"}</span></div>
            {showRevenue ? <div style={{ display: "flex", justifyContent: "space-between" }}><span>Revenue telemetry</span><span style={{ color: "#94a3b8" }}>not wired</span></div> : null}
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Deploy telemetry</span><span style={{ color: "#94a3b8" }}>not wired</span></div>
          </div>
        </div>

        {/* recent activity */}
        <div style={{ ...card, gridColumn: "span 12" }}>
          <div style={h3}>Recent activity <span style={sub}>latest issue movement</span></div>
          <div style={{ marginTop: 6 }}>
            {s.recent.map((i) => (
              <Link key={i.issue_ref} href="/smc/issues" style={{ display: "flex", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f5f9", textDecoration: "none", color: "inherit" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", flexShrink: 0, background: i.status === "Resolved" ? "#10b981" : i.severity?.toLowerCase().includes("critical") ? "#ef4444" : i.severity?.toLowerCase().includes("high") ? "#f59e0b" : "#94a3b8" }} />
                <span style={{ flex: 1, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.title}</span>
                <span style={{ fontFamily: "DM Mono", fontSize: 11, color: "#1f487c" }}>{i.issue_ref}</span>
                <span className={stPill(i.status)} style={{ fontSize: 9 }}>{i.status}</span>
                <span style={{ fontSize: 11, color: "#94a3b8", width: 56, textAlign: "right" }}>{ago(i.updated_at)}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
