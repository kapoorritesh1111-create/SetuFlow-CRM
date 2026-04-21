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
      description: 'Use admin for governed workspace setup: organization defaults, people access, invitations, audit proof, and admin-only control surfaces. This is not the daily trade workflow.',
      sectionLabel: 'Governed workspace setup',
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
      title: 'Dashboard / Overview',
      description: 'Use the geo-first leadership watchtower to see market, country, queue health, execution drift, and what needs intervention now. This is a support surface, but it should feel operational rather than passive.',
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
        description: 'Work one compressed command center for qualification, blockers, next step, and quote motion without bouncing between products.',
        sectionLabel: 'Primary operating flow',
        tabs: PRODUCT_SHELL_TABS,
        backHref: PRODUCT_ROUTES.app.leads,
        backLabel: 'Back to follow-up list',
      };
    }
    return {
      title: 'Follow-up',
      description: 'Run the follow-up command center where qualification and quote motion stay in one working set with explicit next steps.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.quotes || pathname.startsWith(`${PRODUCT_ROUTES.app.quotes}/`)) {
    return {
      title: 'Quote',
      description: 'Use the quote command center to finish governed pricing and then hand off cleanly into Approval / Send without pretending a quote is already safe to send.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.integrations || pathname.startsWith(`${PRODUCT_ROUTES.app.integrations}/`)) {
    return {
      title: 'Approval / Send',
      description: 'Review approval truth, send blockers, latest outbound action, and resend posture without letting send posture outrun commercial truth.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.orders || pathname.startsWith(`${PRODUCT_ROUTES.app.orders}/`)) {
    return {
      title: 'Orders / Execution',
      description: 'Use one execution desk to prove release readiness, dispatch evidence, blockers, and next action so accepted quote truth is never mistaken for execution readiness.',
      sectionLabel: 'Primary operating flow',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname === PRODUCT_ROUTES.app.pipeline || pathname.startsWith(`${PRODUCT_ROUTES.app.pipeline}/`)) {
    return {
      title: 'Pipeline / Risks',
      description: 'Use the explicit pipeline rescue board to spot stalled work, blockers, and next intervention fast without hiding the actual pipeline view behind softer language.',
      sectionLabel: 'Risk and control',
      tabs: PRODUCT_SHELL_TABS,
    };
  }

  if (pathname.startsWith('/products')) {
    return {
      title: 'Catalog',
      description: 'Use Catalog as governed commercial truth: start from the baseline price, require a reason for overrides, and keep threshold approvals explicit before quote or order confidence is implied.',
      sectionLabel: 'Catalog / Settings / Admin',
      tabs: PRODUCT_SHELL_TABS,
    };
  }
  if (pathname.startsWith('/trade-events')) return { title: 'Trade events', description: 'Useful capture support, intentionally demoted from the main daily shell.', sectionLabel: 'Demoted side tools', showWorkspaceModeSwitch: false };
  if (pathname.startsWith('/settings/lists')) return { title: 'Settings / Lists', description: 'Maintain shared lists, defaults, pipelines, and stage vocabulary that support the workflow. This page is governed setup, not the workflow itself.', sectionLabel: 'Governed workspace setup', tabs: PRODUCT_SHELL_TABS, showWorkspaceModeSwitch: false };
  if (pathname.startsWith('/ai-suggestions')) return { title: 'Contextual AI guidance', description: 'Keep AI guidance contextual and bounded. It should route the operator to the next safe action inside Follow-up, Quote, Approval / Send, or Orders rather than becoming its own product.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/contact-exchange/vcard')) return { title: 'My Card', description: 'Personal sharing tool, intentionally secondary to the trade operating spine.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/tasks')) return { title: 'Tasks', description: 'Supporting work tracker that should not outrank the core trade flow.', sectionLabel: 'Demoted side tools' };
  if (pathname.startsWith('/documents')) return { title: 'Documents', description: 'Review files, documentary completeness, expiry, and evidence gaps close to the core workflow.', sectionLabel: 'Risk and control' };
  if (pathname.startsWith('/compliance')) return { title: 'Compliance', description: 'Keep compliance blockers visible before commercial or execution moves go too far.', sectionLabel: 'Risk and control' };
  return { title: 'Workspace', description: 'Operate daily work from a cleaner shell that matches the trade operator mental model.', sectionLabel: 'SETU Flow workspace' };
}
