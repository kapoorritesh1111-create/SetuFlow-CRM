export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  description?: string;
  aliases?: string[];
  navKey?: string;
  requiresAdmin?: boolean;
};

export type NavSection = {
  id: string;
  label: string;
  icon: string;
  description?: string;
  tone?: 'primary' | 'support' | 'utility';
  items: NavItem[];
};

export type ContextTab = {
  href: string;
  label: string;
  exact?: boolean;
  description?: string;
};

export type RouteMeta = {
  title: string;
  description: string;
  sectionLabel?: string;
  tabs?: ContextTab[];
  backHref?: string;
  backLabel?: string;
};
