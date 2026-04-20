import type { ContextTab, RouteMeta } from '@/components/layout/shell/types';
import { adminAppShellTabs, primaryAppShellNav, PRODUCT_ROUTES } from '@/lib/product-contract';

const PRODUCT_SHELL_TABS: ContextTab[] = primaryAppShellNav.map((item) => ({ href: item.href, label: item.label, exact: item.exact }));
const ADMIN_TABS: ContextTab[] = adminAppShellTabs.map((item) => ({ href: item.href, label: item.label, exact: item.exact }));

export function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith('/admin/')) {
    return {
      title: pathname.startsWith('/admin/invitations')
        ? 'Invitations'
        : pathname.startsWith('/admin/audit')
          ? 'Audit log'
          : pathname.startsWith('/admin/ai-analytics')
            ? 'AI analytics'
            : pathname.startsWith('/admin/organization')
              ? 'Organization'
              : 'Users',
      description: 'Manage organization overview, workspace access, invitations, and audit visibility without leaving the admin area.',
      tabs: ADMIN_TABS,
    };
  }

  if (pathname === '/contracts' || pathname.startsWith('/contracts/')) {
    return { title: 'Contracts', description: 'Track signed commitments, linked quotes, files, and open blockers from one progression desk.', tabs: PRODUCT_SHELL_TABS };
  }
  if (pathname === PRODUCT_ROUTES.app.dashboard || pathname.startsWith(`${PRODUCT_ROUTES.app.dashboard}/`)) {
    return { title: 'Dashboard', description: 'Get to the most important buyer and supplier metrics first, then move into focused operating lanes.', tabs: PRODUCT_SHELL_TABS };
  }
  if (pathname === PRODUCT_ROUTES.app.leads || pathname.startsWith(`${PRODUCT_ROUTES.app.leads}/`)) {
    if (/^\/leads\/[^/]+\/quote/.test(pathname)) {
      return { title: 'Quotes', description: 'Review commercial output, approvals, and pricing details for this lead.', backHref: pathname.replace(/\/quote.*/, ''), backLabel: 'Back to lead profile' };
    }
    if (/^\/leads\/[^/]+\/rfq/.test(pathname)) {
      return { title: 'RFQs', description: 'Create and manage RFQs for the selected lead without leaving the workflow.', backHref: pathname.replace(/\/rfq.*/, ''), backLabel: 'Back to lead profile' };
    }
    if (/^\/leads\/[^/]+$/.test(pathname)) {
      return { title: 'Lead profile', description: 'Stay inside one lead context for stage movement, follow-ups, RFQs, quotes, and activity history.', tabs: PRODUCT_SHELL_TABS, backHref: PRODUCT_ROUTES.app.leads, backLabel: 'Back to leads' };
    }
    return { title: 'Leads', description: 'Find the right lead quickly, act in bulk when needed, and open existing leads in the command center route.', tabs: PRODUCT_SHELL_TABS };
  }
  if (pathname === PRODUCT_ROUTES.app.quotes || pathname.startsWith(`${PRODUCT_ROUTES.app.quotes}/`)) {
    return { title: 'Quotes', description: 'Review commercial fit, confirm approval state, and move into order creation only when the gate is clear.', tabs: PRODUCT_SHELL_TABS };
  }
  if (pathname === PRODUCT_ROUTES.app.orders || pathname.startsWith(`${PRODUCT_ROUTES.app.orders}/`)) {
    return { title: 'Orders', description: 'Carry accepted commercial truth into operational readiness without hiding blockers or required follow-through.', tabs: PRODUCT_SHELL_TABS };
  }
  if (pathname === PRODUCT_ROUTES.app.pipeline || pathname.startsWith(`${PRODUCT_ROUTES.app.pipeline}/`)) {
    return { title: 'Pipeline', description: 'Keep stage movement visible, actionable, and easy to scan across the full workspace.', tabs: PRODUCT_SHELL_TABS };
  }
  if (pathname.startsWith('/products')) return { title: 'Products', description: 'Manage shared commercial reference data for daily execution.' };
  if (pathname.startsWith('/trade-events')) return { title: 'Trade events', description: 'Maintain trade event records used across lead and pipeline workflows.' };
  if (pathname.startsWith('/settings/lists')) return { title: 'Settings lists', description: 'Update shared option lists that power forms throughout the app.' };
  if (pathname.startsWith('/integrations')) return { title: 'Integrations', description: 'Review external systems connected to this workspace.' };
  if (pathname.startsWith('/ai-suggestions')) return { title: 'AI assist', description: 'Review explainable summaries and next-best-action suggestions anchored to workspace data.' };
  if (pathname.startsWith('/contact-exchange/vcard')) return { title: 'My Digital vCard', description: 'Share your professional contact identity through one review-first surface before QR, link, and VCF automation ships.', tabs: PRODUCT_SHELL_TABS };
  if (pathname.startsWith('/contact-exchange/scan')) return { title: 'Scan Contact Info', description: 'Capture inbound contact details through one AI-assisted review surface without forcing save automation yet.', tabs: PRODUCT_SHELL_TABS };
  if (pathname.startsWith('/tasks')) return { title: 'Tasks', description: 'Track outstanding work tied to the commercial operating flow.' };
  if (pathname.startsWith('/documents')) return { title: 'Documents', description: 'Review deal-linked files, version posture, expiry, and approvals without leaving the operations lane.' };
  if (pathname.startsWith('/compliance')) return { title: 'Compliance', description: 'Keep required compliance tasks, reviews, and lead blockers visible alongside commercial work.' };
  return { title: 'Workspace', description: 'Operate daily work from a cleaner, more consistent application shell.' };
}
