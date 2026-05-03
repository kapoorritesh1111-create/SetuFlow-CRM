export function ThreeDIconOrb({ icon, tone = 'blue', label }: { icon: string; tone?: 'blue' | 'violet' | 'teal' | 'gold'; label?: string }) {
  const tones = {
    blue: 'from-blue-500 to-sky-300 text-white shadow-blue-500/25',
    violet: 'from-violet-600 to-fuchsia-300 text-white shadow-violet-500/25',
    teal: 'from-teal-500 to-emerald-300 text-white shadow-teal-500/25',
    gold: 'from-amber-300 to-amber-500 text-amber-950 shadow-amber-500/25'
  } as const;
  return <span aria-label={label} className={`relative inline-grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br text-xl shadow-xl ${tones[tone]} before:absolute before:right-2 before:top-2 before:h-3 before:w-3 before:rounded-full before:bg-white/45 before:content-['']`}>{icon}</span>;
}
ThreeDIconOrb.displayName = '3DIconOrb';
