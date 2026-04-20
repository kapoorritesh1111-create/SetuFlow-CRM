export type NavItem = { href: string; label: string; exact?: boolean };
export type NavSection = { id: string; label: string; icon: string; items: NavItem[] };
export type ContextTab = { href: string; label: string; exact?: boolean };

export type RouteMeta = {
  title: string;
  description: string;
  tabs?: ContextTab[];
  backHref?: string;
  backLabel?: string;
};
