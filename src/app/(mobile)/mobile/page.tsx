import Link from 'next/link';
import { MobileHomeHero } from '@/features/mobile/components/mobile-navigation';
import { ThreeDIconOrb } from '@/features/mobile/components/icon-3d-orb';

const actions = [
  { href: '/mobile/leads', title: 'Current leads', body: 'Review status, owner, team, and next actions.', icon: '◎', tone: 'blue' as const },
  { href: '/mobile/quote', title: 'Quick quote', body: 'Start a buyer quote from templates.', icon: '◌', tone: 'gold' as const },
  { href: '/mobile/capture', title: 'Capture', body: 'Add buyer or supplier from the field.', icon: '+', tone: 'violet' as const },
  { href: '/mobile/notifications', title: 'Updates', body: 'See save, sync, and follow-up alerts.', icon: '◔', tone: 'teal' as const }
];

export default function MobileHomePage() {
  return <>
    <MobileHomeHero />
    <section className="grid grid-cols-2 gap-3">{actions.map((action) => <Link key={action.href} href={action.href} className="rounded-[1.75rem] bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"><ThreeDIconOrb icon={action.icon} tone={action.tone} /><h2 className="mt-3 text-base font-black text-slate-950 dark:text-white">{action.title}</h2><p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-300">{action.body}</p></Link>)}</section>
  </>;
}
