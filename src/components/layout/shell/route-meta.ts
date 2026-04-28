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
          ? 'Audit trail'
          : pathname.startsWith('/admin/ai-analytics')
            ? 'AI review'
            : pathname.startsWith('/admin/organization')
              ? 'Organization setup'
              : pathname.startsWith('/admin/product-management')
                ? 'Catalog admin'
                : pathname.startsWith('/admin/users')
                  ? 'People & access'
                  : 'Admin / Organization',
      description: 'Use admin for workspace setup: organization defaults, people access, invitations, audit proof, and admin-only controls. This is not the daily work route.',
      sectionLabel: 'Workspace setup',
      tabs: ADMIN_TABS,
      showWorkspaceModeSwitch: false,
    };
  }

  if (pathname === '/contracts' || pathname.startsWith('/contracts/')) {
    return {
      title: 'Contracts',
      description: 'Keep signed commitments and commercial lock visibility close to the operating flow.',
      sectionLabel: 'Leadership / overview',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.dashboard || pathname.startsWith(`${PRODUCT_ROUTES.app.dashboard}/`)) {
    return {
      title: 'Dashboard',
      description: 'Use Dashboard to see market, country, queue health, execution drift, and what needs intervention now. This is a support surface, but it should still feel operational.',
      sectionLabel: 'Trade Command Center',
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
        backLabel: 'Back to Follow-up',
      };
    }
    if (/^\/leads\/[^/]+\/rfq/.test(pathname)) {
      return {
        title: 'RFQs',
        description: 'Manage RFQ work for the selected lead without breaking the normal sales sequence.',
        sectionLabel: 'Primary operating flow',
        backHref: pathname.replace(/\/rfq.*/, ''),
        backLabel: 'Back to Follow-up',
      };
    }
    if (/^\/leads\/[^/]+$/.test(pathname)) {
      return {
        title: 'Follow-up',
        description: 'Work one focused page for qualification, blockers, next step, and quote progress without bouncing between tools.',
        sectionLabel: 'Primary operating flow',
        tabs: PRODUCT_SHELL_TABS,
        backHref: PRODUCT_ROUTES.app.leads,
        backLabel: 'Back to Follow-up list',
      };
    }
    return {
      title: 'Follow-up',
      description: 'Run follow-up where qualification and quote progress stay in one working set with clear next steps.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.quotes || pathname.startsWith(`${PRODUCT_ROUTES.app.quotes}/`)) {
    return {
      title: 'Quote',
      description: 'Finish pricing here, then move into Approvals & Sending only when the quote is actually ready.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.integrations || pathname.startsWith(`${PRODUCT_ROUTES.app.integrations}/`)) {
    return {
      title: 'Approvals & Sending',
      description: 'Review approval status, send blockers, latest outbound activity, and resend history without sending too early.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.orders || pathname.startsWith(`${PRODUCT_ROUTES.app.orders}/`)) {
    return {
      title: 'Orders / Execution',
      description: 'Use one orders workspace to confirm release readiness, dispatch evidence, blockers, and the next action so an accepted quote is not confused with execution readiness.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.pipeline || pathname.startsWith(`${PRODUCT_ROUTES.app.pipeline}/`)) {
    return {
      title: 'Pipeline / Risks',
      description: 'Use the pipeline board to spot stalled work, blockers, and the next intervention fast without hiding the real queue state.',
      sectionLabel: 'Risk and control',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname.startsWith('/products')) {
    return {
      title: 'Catalog',
      description: 'Use Catalog as the pricing source: start from the base price, require a reason for overrides, and keep approval thresholds visible before a quote or order looks ready.',
      sectionLabel: 'Catalog / Settings / Admin',
      tabs: PRODUCT_SHELL_TABS,
    };
  }
  if (pathname.startsWith('/trade-events')) return { title: 'Trade events', description: 'Useful capture support, intentionally demoted from the main daily shell.', sectionLabel: 'Demoted side tools', showWorkspaceModeSwitch: false };
  if (pathname.startsWith('/settings/lists')) return { title: 'Settings / Lists', description: 'Maintain shared lists, defaults, pipelines, and stage names that support the workflow. This page is setup, not the workflow itself.', sectionLabel: 'Workspace setup', tabs: PRODUCT_SHELL_TABS, showWorkspaceModeSwitch: false };
  if (pathname.startsWith('/ai-suggestions')) return { title: 'AI help', description: 'Keep AI help contextual and bounded. It should point the team to the next safe action inside Follow-up, Quote, Approvals & Sending, or Orders instead of becoming its own product.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/contact-exchange/vcard')) return { title: 'My Card', description: 'Personal sharing tool, intentionally secondary to the trade operating spine.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/tasks')) return { title: 'Tasks', description: 'Supporting work tracker that should not outrank the core trade flow.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/documents')) return { title: 'Documents', description: 'Review files, documentary completeness, expiry, and evidence gaps close to the core workflow.', sectionLabel: 'Risk and control' };
  if (pathname.startsWith('/compliance')) return { title: 'Compliance', description: 'Keep compliance blockers visible before commercial or execution moves go too far.', sectionLabel: 'Risk and control' };
  return { title: 'Workspace', description: 'Operate daily work from a cleaner shell that matches how the team actually works.', sectionLabel: 'SETU Flow workspace' };
}
