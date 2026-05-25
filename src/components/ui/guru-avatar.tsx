/**
 * GuruAvatar — Branded Setu Guru avatar.
 * Replaces all 🤖 / 🧠 generic AI emojis throughout the app.
 * Uses /setu-guru/setu-guru-avatar.svg (already in /public).
 */

interface GuruAvatarProps {
  /** xs=16px · sm=20px (default) · md=28px · lg=40px */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showOnlineDot?: boolean;
  className?: string;
}

const SIZE: Record<NonNullable<GuruAvatarProps['size']>, string> = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-7 w-7',
  lg: 'h-10 w-10',
};

export function GuruAvatar({ size = 'sm', showOnlineDot = false, className = '' }: GuruAvatarProps) {
  return (
    <span className={`relative inline-flex flex-shrink-0 ${className}`}>
      <span className={`grid place-items-center rounded-full bg-gradient-to-br from-sky-400 via-blue-600 to-indigo-700 p-[2px] ${SIZE[size]}`}>
        <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" className="h-full w-full rounded-full object-cover" />
      </span>
      {showOnlineDot && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
      )}
    </span>
  );
}

/** Inline strip: GuruAvatar + "Setu Guru" text */
export function GuruLabel({ text = 'Setu Guru' }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <GuruAvatar size="xs" />
      <span className="text-[10px] font-bold text-sky-700">{text}</span>
    </span>
  );
}
