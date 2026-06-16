'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const NAV_ITEMS = [
  { id: 'dash', path: '/smc', icon: 'grid', label: 'Dashboard', group: 'main' },
  { id: 'issues', path: '/smc/issues', icon: 'alert-circle', label: 'Issues', group: 'main' },
  { id: 'board', path: '/smc/board', icon: 'columns', label: 'Sprint Board', group: 'main' },
  { id: 'leads', path: '/smc/leads', icon: 'user-plus', label: 'Internal Leads', group: 'main' },
  { id: 'clients', path: '/smc/clients', icon: 'users', label: 'Client Orgs', group: 'main' },
  { id: 'div1', path: '', icon: '', label: '', group: 'div' },
  { id: 'deploy', path: '/smc/deploy', icon: 'cloud', label: 'Deployments', group: 'ops' },
  { id: 'incidents', path: '/smc/incidents', icon: 'triangle', label: 'Incidents', group: 'ops' },
  { id: 'revenue', path: '/smc/revenue', icon: 'dollar', label: 'Revenue', group: 'ops' },
  { id: 'div2', path: '', icon: '', label: '', group: 'div' },
  { id: 'seo', path: '/smc/seo', icon: 'search', label: 'SEO', group: 'intel' },
  { id: 'guru', path: '/smc/guru', icon: 'guru', label: 'Guru Ops', group: 'intel' },
  { id: 'flags', path: '/smc/flags', icon: 'flag', label: 'Feature Flags', group: 'intel' },
  { id: 'wiki', path: '/smc/wiki', icon: 'book', label: 'Wiki', group: 'intel' },
  { id: 'changelog', path: '/smc/changelog', icon: 'file-text', label: 'Changelog', group: 'intel' },
] as const;

const SIDEBAR_VIEWS = [
  { label: 'All Issues', path: '/smc/issues', count: '373' },
  { label: 'My Issues', path: '/smc/issues?filter=mine', count: '12' },
  { label: 'Active Sprint', path: '/smc/issues?sprint=current', count: '3' },
  { label: 'Board View', path: '/smc/board', count: '' },
  { label: 'Backlog', path: '/smc/issues?filter=backlog', count: '10' },
];

const TEAM = [
  { initials: 'RK', name: 'Ritesh Kapoor', color: '#279491', online: true },
  { initials: 'KM', name: 'Kumar Mayank', color: '#1F487C', online: true },
  { initials: 'AA', name: 'Ankush Arya', color: '#8b5cf6', online: false },
];

function RailIcon({ icon }: { icon: string }) {
  const svgProps = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };
  switch (icon) {
    case 'grid': return <svg {...svgProps}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
    case 'alert-circle': return <svg {...svgProps}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
    case 'columns': return <svg {...svgProps}><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
    case 'user-plus': return <svg {...svgProps}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>;
    case 'users': return <svg {...svgProps}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>;
    case 'cloud': return <svg {...svgProps}><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
    case 'triangle': return <svg {...svgProps}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'dollar': return <svg {...svgProps}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'search': return <svg {...svgProps}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'guru': return <svg {...svgProps}><path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4.5 7.5L12 19l-2.5-2.5C7 14.5 5 12 5 9a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>;
    case 'flag': return <svg {...svgProps}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
    case 'book': return <svg {...svgProps}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
    case 'file-text': return <svg {...svgProps}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
    case 'bell': return <svg {...svgProps}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'activity': return <svg {...svgProps}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    default: return <svg {...svgProps}><circle cx="12" cy="12" r="10"/></svg>;
  }
}

export function SmcShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/smc') return pathname === '/smc';
    return pathname.startsWith(path);
  };

  const getModuleTitle = () => {
    if (pathname === '/smc') return 'Dashboard';
    const item = NAV_ITEMS.find(n => n.path && pathname.startsWith(n.path));
    return item?.label ?? 'SMC';
  };

  return (
    <div className="smc-shell">
      {/* ═══ RAIL ═══ */}
      <aside className="smc-rail">
        <Link href="/smc" className="smc-rail-logo" title="Setu Mission Control">S</Link>
        {NAV_ITEMS.map(item => {
          if (item.group === 'div') return <div key={item.id} className="smc-rdiv" />;
          return (
            <Link key={item.id} href={item.path} className={`smc-rb ${isActive(item.path) ? 'active' : ''}`} title={item.label}>
              <RailIcon icon={item.icon} />
              <span className="smc-rb-tip">{item.label}</span>
            </Link>
          );
        })}
        <div className="smc-rsp" />
        <Link href="/smc" className="smc-rb" title="Notifications">
          <RailIcon icon="bell" />
          <span className="smc-dot" />
        </Link>
        <Link href="/smc" className="smc-rb" title="API Health">
          <RailIcon icon="activity" />
        </Link>
        <div className="smc-rav">RK</div>
      </aside>

      {/* ═══ SIDEBAR ═══ */}
      <nav className="smc-sb">
        <div className="smc-sb-head">
          <h2>
            <RailIcon icon={NAV_ITEMS.find(n => n.path && isActive(n.path))?.icon ?? 'grid'} />
            {getModuleTitle()}
            <span className="smc-mbdg">Internal</span>
          </h2>
        </div>
        <div className="smc-sb-search">
          <input type="text" placeholder={`Search ${getModuleTitle().toLowerCase()}…`} />
        </div>
        <div className="smc-sb-scroll">
          {(pathname === '/smc' || pathname.startsWith('/smc/issues') || pathname.startsWith('/smc/board')) && (
            <>
              <div className="smc-ng">
                <div className="smc-ngl">Views</div>
                {SIDEBAR_VIEWS.map(v => (
                  <Link key={v.label} href={v.path} className={`smc-ni ${pathname === v.path || (v.path === '/smc/issues' && pathname === '/smc/issues') ? 'active' : ''}`}>
                    {v.label}
                    {v.count && <span className="smc-cnt">{v.count}</span>}
                  </Link>
                ))}
              </div>
              <div className="smc-ng">
                <div className="smc-ngl">Filters</div>
                <Link href="/smc/issues?type=bug" className="smc-ni">Bugs <span className="smc-cnt">8</span></Link>
                <Link href="/smc/issues?status=blocked" className="smc-ni">Blocked <span className="smc-cnt">2</span></Link>
                <Link href="/smc/issues?status=deferred" className="smc-ni">Deferred <span className="smc-cnt">10</span></Link>
              </div>
              <div className="smc-ng">
                <div className="smc-ngl">Sprints</div>
                <Link href="/smc/issues?sprint=24" className="smc-ni">Sprint 24</Link>
                <Link href="/smc/issues?sprint=23" className="smc-ni">Sprint 23</Link>
                <Link href="/smc/issues?sprint=22" className="smc-ni">Sprint 22</Link>
              </div>
            </>
          )}
          {pathname.startsWith('/smc/leads') && (
            <div className="smc-ng">
              <div className="smc-ngl">Pipeline</div>
              <Link href="/smc/leads" className="smc-ni active">All Leads <span className="smc-cnt">3</span></Link>
              <Link href="/smc/leads?stage=inquiry" className="smc-ni">Inquiry</Link>
              <Link href="/smc/leads?stage=qualified" className="smc-ni">Qualified</Link>
              <Link href="/smc/leads?stage=trial" className="smc-ni">Trial</Link>
              <Link href="/smc/leads?stage=converted" className="smc-ni">Converted</Link>
            </div>
          )}
        </div>
        {/* Team */}
        <div className="smc-tm-sec">
          <h4>Team</h4>
          {TEAM.map(t => (
            <div key={t.initials} className="smc-tm">
              <div className="smc-av" style={{ background: t.color }}>
                {t.initials}
                {t.online && <span className="smc-on" />}
              </div>
              {t.name}
            </div>
          ))}
        </div>
      </nav>

      {/* ═══ MAIN ═══ */}
      <main className="smc-main">
        {children}
      </main>
    </div>
  );
}
