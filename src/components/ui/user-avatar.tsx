import { isSetuFlowAvatarPresetUrl } from '@/lib/profile/avatar-presets';

type UserAvatarProps = {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  initials?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  imageClassName?: string;
  alt?: string;
};

const sizeClasses = { xs: 'h-8 w-8 text-[11px]', sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-14 w-14 text-base', xl: 'h-24 w-24 text-xl', '2xl': 'h-52 w-52 text-6xl sm:h-60 sm:w-60' } as const;

export function getUserInitials(name?: string | null, email?: string | null) {
  const source = String(name || email || 'Setu Flow').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function UserAvatar({ name, email, avatarUrl, initials, size = 'md', className = '', imageClassName = '', alt }: UserAvatarProps) {
  const src = String(avatarUrl ?? '').trim();
  const isPreset = isSetuFlowAvatarPresetUrl(src);
  const fallback = initials || getUserInitials(name, email);
  const base = `${sizeClasses[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-900 to-blue-700 font-semibold text-white ring-1 ring-slate-200 ${className}`;
  return (
    <div className={base}>
      {src ? <img src={src} alt={alt || name || email || 'Setu Flow user'} className={`h-full w-full ${isPreset ? 'object-contain bg-white' : 'object-cover'} ${imageClassName}`} /> : fallback}
    </div>
  );
}
