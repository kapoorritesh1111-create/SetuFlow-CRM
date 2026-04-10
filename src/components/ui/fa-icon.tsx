import { cn } from '@/lib/utils';

export function FaIcon({
  icon,
  className,
  fixedWidth = false,
}: {
  icon: string;
  className?: string;
  fixedWidth?: boolean;
}) {
  return <i aria-hidden="true" className={cn('fa', `fa-${icon}`, fixedWidth && 'fa-fw', className)} />;
}
