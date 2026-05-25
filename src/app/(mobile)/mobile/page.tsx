import Link from "next/link";
import { MobileHomeHero } from "@/features/mobile/components/mobile-navigation";
import { ThreeDIconOrb } from "@/features/mobile/components/icon-3d-orb";

// SF-18-120: Upgraded action tiles with Leads as primary full-width tile
const primaryAction = { href: "/mobile/leads", title: "Follow-up Queue", icon: "◎", subtitle: "Review and action leads", tone: "blue" as const };
const secondaryActions = [
  { href: "/mobile/pipeline", title: "Pipeline", icon: "⊞", tone: "blue" as const },
  { href: "/mobile/dashboard", title: "Dashboard", icon: "◈", tone: "teal" as const },
  { href: "/mobile/capture", title: "Capture", icon: "+", tone: "violet" as const },
  { href: "/mobile/guru", title: "Guru", icon: "🧠", tone: "gold" as const },
];
// Keep original for backward compat
const actions = secondaryActions;

export default function MobileHomePage() {
  return (
    <>
      <MobileHomeHero />
      {/* SF-18-120: Primary full-width Leads tile */}
      <Link href={primaryAction.href}
        className="flex items-center gap-4 rounded-[2rem] bg-blue-600 p-5 text-white shadow-xl shadow-blue-600/20 active:scale-[.98] transition">
        <span className="text-4xl">◎</span>
        <div>
          <p className="font-black text-lg leading-none">{primaryAction.title}</p>
          <p className="text-xs text-blue-200 mt-1">{primaryAction.subtitle}</p>
        </div>
        <span className="ml-auto text-2xl opacity-60">›</span>
      </Link>
      <section className="grid grid-cols-2 gap-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            aria-label={action.title}
            className="rounded-[1.75rem] bg-white/90 p-4 shadow-xl shadow-blue-950/5 dark:bg-slate-900/90"
          >
            <ThreeDIconOrb icon={action.icon} tone={action.tone} />
            <h2 className="mt-3 text-base font-black text-slate-950 dark:text-white">
              {action.title}
            </h2>
          </Link>
        ))}
      </section>
    </>
  );
}
