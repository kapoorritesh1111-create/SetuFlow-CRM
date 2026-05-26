import { cn } from '@/lib/utils';

const iconPaths = {
  analytics: 'M4 18h16M7 15v-4m5 4V7m5 8v-7M5 9l4-4 4 3 6-6',
  audit: 'M8 6h8M8 10h8M8 14h5M6 3h12a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2-3-2-3 2V5a2 2 0 0 1 2-2Z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
  box: 'M21 8 12 3 3 8l9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M9 7h2M9 11h2M9 15h2M16 9h2a2 2 0 0 1 2 2v10M3 21h18',
  calendar: 'M7 3v4M17 3v4M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z',
  clipboard: 'M9 4h6l1 2h3v15H5V6h3l1-2ZM9 11h6M9 15h6',
  dollar: 'M12 3v18M17 7.5C15.5 6.3 14 6 12.3 6 9.8 6 8 7.1 8 9s1.7 2.7 4.5 3.2C15.2 12.8 17 13.7 17 16s-2.2 3-5 3c-2 0-3.7-.5-5-1.8',
  file: 'M14 3H6a2 2 0 0 0-2 2v16h16V9l-6-6ZM14 3v6h6M8 14h8M8 18h5',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21M12 3C9.5 5.5 8.5 8.5 8.5 12s1 6.5 3.5 9',
  home: 'M3 11 12 4l9 7M5 10v10h14V10M9 20v-6h6v6',
  key: 'M14 14a5 5 0 1 1 1.4-3.6L21 16v3h-3v-3h-3l-1-2Z',
  lead: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0M17 5l2 2 3-4',
  mail: 'M4 6h16v12H4V6Zm0 0 8 7 8-7',
  more: 'M6 12h.01M12 12h.01M18 12h.01',
  orders: 'M6 3h12l3 5v13H3V8l3-5ZM3 8h18M9 12h6',
  plug: 'M9 7V3M15 7V3M7 7h10v5a5 5 0 0 1-10 0V7ZM12 17v4',
  quote: 'M7 7h10M7 11h10M7 15h6M5 3h14a2 2 0 0 1 2 2v16l-4-3H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z',
  rocket: 'M12 15 9 12c1-4 4-7 9-9 0 5-2 8-6 9ZM9 12l-4 1-2 4 5-2M12 15l-1 4-4 2 2-5M14 7h.01',
  search: 'M10 18a8 8 0 1 1 5.7-2.3L21 21',
  security: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3ZM9 12l2 2 4-5',
  sparkles: 'M12 3l1.5 5L18 10l-4.5 2L12 17l-1.5-5L6 10l4.5-2L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 4l.8 2.2L8 7l-2.2.8L5 10l-.8-2.2L2 7l2.2-.8L5 4Z',
  user: 'M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM5 21a7 7 0 0 1 14 0',
  users: 'M15 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM3 21a8 8 0 0 1 16 0M18 9a3 3 0 0 1 0 6M21 21a6 6 0 0 0-3-5.2',
  workflow: 'M6 6h6v6H6V6ZM12 9h5a3 3 0 0 1 3 3v1M18 18h-6v-6h6v6ZM6 18h3M3 18h.01',
  zap: 'M13 2 4 14h7l-1 8 10-13h-7l1-7Z',
} as const;

export type SetuIconName = keyof typeof iconPaths;

export function SetuIcon({ name, className }: { name: SetuIconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4 shrink-0', className)}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
