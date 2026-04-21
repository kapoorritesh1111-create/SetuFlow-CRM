import type { ContextTab, RouteMeta } from '@/components/layout/shell/types';
import { adminAppShellTabs, primaryAppShellNav, PRODUCT_ROUTES } from '@/lib/product-contract';

const PRODUCT_SHELL_TABS: ContextTab[] = primaryAppShellNav.map((item) => ({
  href: item.href,
  label: item.label,
  exact: item.exact,
  description: item.description,
}));
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
              : pathname.startsWith('/admin/product-management')
                ? 'Product management'
                : 'Admin',
      description: 'Manage governed workspace controls, access, audit visibility, and product administration without polluting the daily operating lanes.',
      sectionLabel: 'Catalog / Admin / Settings',
      tabs: ADMIN_TABS,
    };
  }

  if (pathname === '/contracts' || pathname.startsWith('/contracts/')) {
    return {
      title: 'Contracts',
      description: 'Keep signed commitments and commercial lock visibility close to the operating flow.',
      sectionLabel: 'Risk and control',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.dashboard || pathname.startsWith(`${PRODUCT_ROUTES.app.dashboard}/`)) {
    return {
      title: 'Overview',
      description: 'Use the watchtower to triage queue health, blocked work, and execution drift. Do not treat it as the main place to do the job.',
      sectionLabel: 'Risk and control',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.capture || pathname.startsWith(`${PRODUCT_ROUTES.app.capture}/`)) {
    return {
      title: 'Capture',
      description: 'Review inbound contact detail first, then push clean records into follow-up without forcing blind automation.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.leads || pathname.startsWith(`${PRODUCT_ROUTES.app.leads}/`)) {
    if (/^\/leads\/[^/]+\/quote/.test(pathname)) {
      return {
        title: 'Quote',
        description: 'Review commercial output, approvals, and pricing detail for this lead without losing the surrounding follow-up context.',
        sectionLabel: 'Primary operating flow',
        backHref: pathname.replace(/\/quote.*/, ''),
        backLabel: 'Back to follow-up',
      };
    }
    if (/^\/leads\/[^/]+\/rfq/.test(pathname)) {
      return {
        title: 'RFQs',
        description: 'Manage RFQ work for the selected lead without breaking the lead-owned operating sequence.',
        sectionLabel: 'Primary operating flow',
        backHref: pathname.replace(/\/rfq.*/, ''),
        backLabel: 'Back to follow-up',
      };
    }
    if (/^\/leads\/[^/]+$/.test(pathname)) {
      return {
        title: 'Follow-up',
        description: 'Stay inside one record for qualification, blockers, quote readiness, and activity history.',
        sectionLabel: 'Primary operating flow',
        tabs: PRODUCT_SHELL_TABS,
        backHref: PRODUCT_ROUTES.app.leads,
        backLabel: 'Back to follow-up list',
      };
    }
    return {
      title: 'Follow-up',
      description: 'Work owners, next actions, and qualification state before anything graduates into governed quote work.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.quotes || pathname.startsWith(`${PRODUCT_ROUTES.app.quotes}/`)) {
    return {
      title: 'Quote',
      description: 'Build commercial truth from catalog defaults, keep override reasons explicit, and move forward only when approval state is clean.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.integrations || pathname.startsWith(`${PRODUCT_ROUTES.app.integrations}/`)) {
    return {
      title: 'Approval / Send',
      description: 'Review governed outbound state, sync readiness, and communication continuity without letting send posture outrun commercial truth.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.orders || pathname.startsWith(`${PRODUCT_ROUTES.app.orders}/`)) {
    return {
      title: 'Orders / Execution',
      description: 'Carry accepted quote truth into operational readiness while keeping blockers, documentary posture, and milestones visible.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.pipeline || pathname.startsWith(`${PRODUCT_ROUTES.app.pipeline}/`)) {
    return {
      title: 'Exceptions / Risks',
      description: 'Scan stalled, blocked, or fragile work quickly, then route the operator back into the right execution lane.',
      sectionLabel: 'Risk and control',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname.startsWith('/products')) {
    return {
      title: 'Catalog',
      description: 'Maintain products and baseline pricing without weakening the governed override contract.',
      sectionLabel: 'Catalog / Admin / Settings',
      tabs: PRODUCT_SHELL_TABS,
    };
  }
  if (pathname.startsWith('/trade-events')) return { title: 'Trade events', description: 'Useful capture support, intentionally demoted from the main daily shell.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/settings/lists')) return { title: 'Settings', description: 'Update workspace defaults and shared lists that support the main operating flow.', sectionLabel: 'Catalog / Admin / Settings', tabs: PRODUCT_SHELL_TABS };
  if (pathname.startsWith('/ai-suggestions')) return { title: 'AI assist', description: 'Keep AI helpful and bounded. It should support the workflow, not become its own destination.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/contact-exchange/vcard')) return { title: 'My Card', description: 'Personal sharing tool, intentionally secondary to the trade operating spine.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/tasks')) return { title: 'Tasks', description: 'Supporting work tracker that should not outrank the core trade flow.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/documents')) return { title: 'Documents', description: 'Review files, documentary completeness, expiry, and evidence gaps close to the core workflow.', sectionLabel: 'Risk and control' };
  if (pathname.startsWith('/compliance')) return { title: 'Compliance', description: 'Keep compliance blockers visible before commercial or execution moves go too far.', sectionLabel: 'Risk and control' };
  return { title: 'Workspace', description: 'Operate daily work from a cleaner shell that matches the trade operator mental model.', sectionLabel: 'SETU Flow workspace' };
}
