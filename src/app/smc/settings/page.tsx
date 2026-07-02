import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = 'force-dynamic';

type SmcMember = { display_name: string; role: string; is_active: boolean };

async function getTeamMembers(): Promise<SmcMember[]> {
  try {
    const sb = await createClient();
    const { data } = await (sb as any).from('smc_team_members')
      .select('display_name, role, is_active')
      .eq('is_active', true)
      .order('role', { ascending: true });
    return (data ?? []) as SmcMember[];
  } catch { return []; }
}

export default async function SmcSettingsPage() {
  const team = await getTeamMembers();
  const teamItems = team.length > 0
    ? team.map(m => `${m.display_name} (${m.role})`)
    : ['Ritesh Kapoor (owner)', 'Kumar Mayank (lead)', 'Ankush Arya (member)'];

  const SETTINGS_SECTIONS = [
    {
      title: 'Workspace Preferences', status: 'Ready',
      body: 'Default SMC view, compact table density, and personal workspace display preferences.',
      items: ['Default view: Issues', 'Density: Comfortable', 'Sidebar: Expanded'],
      action: null,
    },
    {
      title: 'Notifications', status: 'Next',
      body: 'Route operational alerts for issues, board movement, comments, and realtime team chat.',
      items: ['In-app alerts', 'Chat message alerts', 'Issue assignment alerts'],
      action: null,
    },
    {
      title: 'Team & Access', status: 'Live',
      body: `${team.length || 3} active team members. Add new hires, set nav group restrictions, and manage feature permissions.`,
      items: teamItems,
      action: { label: 'Manage Team Access →', href: '/smc/settings/access' },
    },
    {
      title: 'Issue Defaults', status: 'Ready',
      body: 'Defaults used when creating SMC issues from the command center.',
      items: ['Sprint: current', 'Status: Open', 'Reporter: Ritesh Kapoor'],
      action: null,
    },
    {
      title: 'Data & Automation', status: 'Live',
      body: 'Tracker data, realtime chat, storage attachments, and deployment signals used by SMC.',
      items: ['Supabase tracker', 'Realtime chat', 'Attachment storage'],
      action: null,
    },
    {
      title: 'Protected Controls', status: 'Protected',
      body: 'High-impact workspace controls stay protected until permission gates are finalized.',
      items: ['Sprint archive policy', 'Automation controls', 'Workspace audit trail'],
      action: null,
    },
  ] as const;

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Operations</div><h1>Settings</h1></div>
      </div>
      <section className="smc-settings-page">
        <div className="smc-settings-hero">
          <div>
            <span className="smc-settings-kicker">Setu Mission Control</span>
            <h2>Workspace settings hub</h2>
            <p>Manage the defaults, routing, and protected controls that shape the SMC operating workspace.</p>
          </div>
          <div className="smc-settings-summary">
            <strong>Live workspace</strong>
            <span>Settings are shown as operational cards so the page feels useful while deeper controls are promoted.</span>
          </div>
        </div>
        <div className="smc-settings-grid">
          {SETTINGS_SECTIONS.map((section) => (
            <article className="smc-settings-card" key={section.title}>
              <div className="smc-settings-card-head">
                <h3>{section.title}</h3>
                <span>{section.status}</span>
              </div>
              <p>{section.body}</p>
              <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
              {'action' in section && section.action ? (
                <Link href={section.action.href} className="smc-btn" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 8 }}>
                  {section.action.label}
                </Link>
              ) : (
                <button className="smc-btn is-disabled" disabled>Configure soon</button>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
