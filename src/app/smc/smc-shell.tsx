"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, type ReactNode } from "react";

const I: Record<string, ReactNode> = {
  grid: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  issues: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  board: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  ),
  leads: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  ),
  clients: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  ),
  deploy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  ),
  incidents: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  revenue: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  seo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  guru: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4.5 7.5L12 19l-2.5-2.5C7 14.5 5 12 5 9a7 7 0 0 1 7-7z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  flags: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  ),
  wiki: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  protocol: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 11l2 2 4-4" />
      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M7 16h10" />
    </svg>
  ),
  changelog: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  health: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  send: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  ),
  filter: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  ),
  user: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  monitor: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
};

type NI = {
  id: string;
  path: string;
  icon: string;
  label: string;
  dot?: boolean;
};
const NAV: (NI | "div")[] = [
  { id: "dash", path: "/smc", icon: "grid", label: "Dashboard" },
  { id: "issues", path: "/smc/issues", icon: "issues", label: "Issues" },
  { id: "board", path: "/smc/board", icon: "board", label: "Sprint Board" },
  { id: "leads", path: "/smc/leads", icon: "leads", label: "Internal Leads" },
  {
    id: "clients",
    path: "/smc/clients",
    icon: "clients",
    label: "Client Orgs",
  },
  "div",
  { id: "deploy", path: "/smc/deploy", icon: "deploy", label: "Deployments" },
  {
    id: "incidents",
    path: "/smc/incidents",
    icon: "incidents",
    label: "Incidents",
  },
  { id: "revenue", path: "/smc/revenue", icon: "revenue", label: "Revenue" },
  "div",
  { id: "seo", path: "/smc/seo", icon: "seo", label: "SEO" },
  { id: "guru", path: "/smc/guru", icon: "guru", label: "Guru Ops" },
  {
    id: "protocol",
    path: "/smc/protocol",
    icon: "protocol",
    label: "Ops Protocol",
  },
  { id: "flags", path: "/smc/flags", icon: "flags", label: "Feature Flags" },
  { id: "wiki", path: "/smc/wiki", icon: "wiki", label: "Docs Hub" },
  { id: "roadmap", path: "/smc/roadmap", icon: "chart", label: "Roadmap" },
  { id: "qa", path: "/smc/qa", icon: "check", label: "QA Tests" },
  { id: "demo", path: "/smc/demo", icon: "monitor", label: "Pre-Demo" },
  {
    id: "changelog",
    path: "/smc/changelog",
    icon: "changelog",
    label: "Changelog",
  },
];

const TEAM = [
  { i: "RK", n: "Ritesh Kapoor", c: "#279491", on: true },
  { i: "KM", n: "Kumar Mayank", c: "#1F487C", on: true },
  { i: "AA", n: "Ankush Arya", c: "#8b5cf6", on: false },
];

const NOTIFS = [
  {
    text: "<b>S26-ADMUX-24</b> — Trade Setup rebuild assigned to you",
    time: "2h ago",
    color: "#f5f3ff",
    ic: "#8b5cf6",
    unread: true,
  },
  {
    text: "New lead: <b>Sunrise Spices</b> submitted inquiry",
    time: "5h ago",
    color: "#fef3c7",
    ic: "#d97706",
    unread: true,
  },
  {
    text: "Deploy <b>#142</b> succeeded — production",
    time: "1d ago",
    color: "#ecfdf5",
    ic: "#10b981",
    unread: false,
  },
  {
    text: "<b>Kumar</b> resolved <b>S25-TS-007</b>",
    time: "2d ago",
    color: "#ecfdf5",
    ic: "#10b981",
    unread: false,
  },
  {
    text: "Sprint <b>26</b> started — 2 issues assigned",
    time: "3d ago",
    color: "#e6f5f4",
    ic: "#279491",
    unread: false,
  },
];

const MSGS = [
  {
    from: "Kumar Mayank",
    text: "Pushed the admin rebuild branch. Can you review?",
    time: "10:15 AM",
    out: false,
  },
  { from: "", text: "Send me the branch name", time: "10:18 AM", out: true },
  {
    from: "Kumar Mayank",
    text: "feature/s26-admin-rebuild — 8 files changed",
    time: "10:20 AM",
    out: false,
  },
  {
    from: "Ankush Arya",
    text: "Trade show demo rescheduled to Thursday",
    time: "10:32 AM",
    out: false,
  },
  {
    from: "",
    text: "Perfect. Kumar lets merge today",
    time: "10:35 AM",
    out: true,
  },
];

export function SmcShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sb, setSb] = useState(true);
  const [notif, setNotif] = useState(false);
  const [chat, setChat] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState("");

  // S27-ENH-011: Esc closes panels
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setNotif(false); setChat(false); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const isA = (p: string) =>
    p === "/smc" ? pathname === "/smc" : pathname.startsWith(p);
  const getL = () =>
    (NAV.find((n) => n !== "div" && isA(n.path)) as NI | undefined)?.label ??
    "Dashboard";
  const getI = () =>
    (NAV.find((n) => n !== "div" && isA(n.path)) as NI | undefined)?.icon ??
    "grid";

  return (
    <div className={`smc-shell ${sb ? "with-sidebar" : ""}`}>
      {/* RAIL */}
      <aside className="smc-rail">
        <Link href="/smc" className="smc-rl" title="Setu Mission Control">
          <span className="smc-rl-mark">SMC</span>
        </Link>
        {NAV.map((item, i) => {
          if (item === "div") return <div key={`d${i}`} className="smc-rdiv" />;
          return (
            <Link
              key={item.id}
              href={item.path}
              title={item.label}
              aria-label={item.label}
              className={`smc-rb ${isA(item.path) ? "active" : ""}`}
            >
              {I[item.icon]}
              {item.dot && <span className="dot" />}
              <span className="smc-rb-tip">{item.label}</span>
            </Link>
          );
        })}
        <div className="smc-rsp" />
        <button
          className="smc-rb"
          title="Sidebar"
          aria-label="Sidebar"
          onClick={() => setSb(!sb)}
        >
          {I.list}
          <span className="smc-rb-tip">Sidebar</span>
        </button>
        <button
          className="smc-rb"
          title="Notifications"
          aria-label="Notifications"
          onClick={() => {
            setNotif(!notif);
            setChat(false);
          }}
        >
          {I.bell}
          <span className="dot" />
          <span className="smc-rb-tip">Notifications</span>
        </button>
        <Link
          href="/smc/health"
          title="API Health"
          aria-label="API Health"
          className="smc-rb"
        >
          {I.health}
          <span className="smc-rb-tip">API Health</span>
        </Link>
        <div className="smc-rav">RK</div>
      </aside>

      {/* SIDEBAR */}
      {sb && (
        <nav className="smc-sb">
          <div className="smc-sb-head">
            <h2>
              {I[getI()]} {getL()} <span className="smc-mbdg">Internal</span>
            </h2>
          </div>
          <div className="smc-sb-search">
            <input
              type="text"
              placeholder={`Search ${getL().toLowerCase()}…`}
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && sidebarSearch.trim()) {
                  router.push(`/smc/issues?q=${encodeURIComponent(sidebarSearch.trim())}`);
                  setSidebarSearch("");
                }
              }}
            />
          </div>
          <div className="smc-sb-scroll">
            {(pathname === "/smc" ||
              pathname.startsWith("/smc/issues") ||
              pathname.startsWith("/smc/board")) && (
              <>
                <div className="smc-ngl">Views</div>
                <Link
                  href="/smc/issues"
                  className={`smc-ni ${pathname === "/smc/issues" ? "active" : ""}`}
                >
                  {I.list} All Issues <span className="cnt">373</span>
                </Link>
                <Link
                  href="/smc/board"
                  className={`smc-ni ${pathname === "/smc/board" ? "active" : ""}`}
                >
                  {I.board} Board View
                </Link>
                <Link href="/smc/issues?view=backlog" className="smc-ni">
                  {I.chart} Backlog <span className="cnt">10</span>
                </Link>
                <div className="smc-ngl">Filters</div>
                <Link href="/smc/issues?type=Bug" className="smc-ni">
                  {I.filter} Bugs <span className="cnt">183</span>
                </Link>
                <Link href="/smc/issues?type=Enhancement" className="smc-ni">
                  {I.filter} Enhancement <span className="cnt">59</span>
                </Link>
                <Link href="/smc/issues?type=UX" className="smc-ni">
                  {I.filter} UX <span className="cnt">74</span>
                </Link>
                <div className="smc-ngl">Sprints</div>
                {[27, 26, 25, 24, 23, 22].map((s) => (
                  <Link
                    key={s}
                    href={`/smc/issues?sprint=${s}`}
                    className="smc-ni"
                  >
                    Sprint {s}
                  </Link>
                ))}
              </>
            )}
            {pathname.startsWith("/smc/leads") && (
              <>
                <div className="smc-ngl">Pipeline</div>
                <Link href="/smc/leads" className="smc-ni active">
                  All Leads <span className="cnt">3</span>
                </Link>
                {[
                  "Inquiry",
                  "Qualified",
                  "Trial",
                  "Negotiating",
                  "Converted",
                ].map((s) => (
                  <Link key={s} href="/smc/leads" className="smc-ni">
                    {s}
                  </Link>
                ))}
              </>
            )}
            {!pathname.startsWith("/smc/issues") &&
              !pathname.startsWith("/smc/board") &&
              !pathname.startsWith("/smc/leads") &&
              pathname !== "/smc" && (
                <>
                  <div className="smc-ngl">Navigation</div>
                  {(NAV.filter((n) => n !== "div") as NI[]).map((n) => (
                    <Link
                      key={n.id}
                      href={n.path}
                      className={`smc-ni ${isA(n.path) ? "active" : ""}`}
                    >
                      {n.label}
                    </Link>
                  ))}
                </>
              )}
          </div>
          <div className="smc-tm-sec">
            <h4>Team</h4>
            {TEAM.map((t) => (
              <div key={t.i} className="smc-tm">
                <div className="smc-av" style={{ background: t.c }}>
                  {t.i}
                  {t.on && <span className="on" />}
                </div>
                {t.n}
              </div>
            ))}
          </div>
        </nav>
      )}

      {/* MAIN */}
      <main className="smc-main">{children}</main>

      {/* NOTIFICATIONS */}
      <div className={`smc-notif ${notif ? "open" : ""}`}>
        <div className="smc-notif-head">
          <h3>Notifications</h3>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="smc-btn"
              style={{ fontSize: 10, padding: "3px 8px" }}
            >
              Mark all read
            </button>
            <button
              onClick={() => setNotif(false)}
              style={{
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
        </div>
        <div className="smc-notif-list">
          {NOTIFS.map((n, i) => (
            <div
              key={i}
              className={`smc-notif-item ${n.unread ? "unread" : ""}`}
            >
              <div
                className="smc-notif-icon"
                style={{ background: n.color, color: n.ic }}
              >
                {I.bell}
              </div>
              <div className="smc-notif-body">
                <p dangerouslySetInnerHTML={{ __html: n.text }} />
                <div className="nt">{n.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT FAB */}
      {!chat && (
        <button
          className="smc-chat-fab"
          onClick={() => {
            setChat(true);
            setNotif(false);
          }}
        >
          {I.chat}
          <span className="fab-dot" />
        </button>
      )}

      {/* CHAT PANEL */}
      <div className={`smc-chat ${chat ? "open" : ""}`}>
        <div className="smc-chat-head">
          {I.chat}
          <h4>Team Chat</h4>
          <span style={{ fontSize: 10, opacity: 0.5 }}>3 members</span>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={() => setChat(false)}>✕</button>
          </div>
        </div>
        <div className="smc-chat-msgs">
          {MSGS.map((m, i) => (
            <div
              key={i}
              className={`smc-msg ${m.out ? "smc-msg-out" : "smc-msg-in"}`}
            >
              {!m.out && <div className="smc-msg-sender">{m.from}</div>}
              <div className="smc-msg-bubble">{m.text}</div>
              <div className="smc-msg-time">{m.time}</div>
            </div>
          ))}
        </div>
        <div className="smc-chat-input">
          <input type="text" placeholder="Message…" />
          <button>{I.send}</button>
        </div>
      </div>
    </div>
  );
}
