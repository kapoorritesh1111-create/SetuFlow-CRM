import type { ReactNode, SVGProps } from 'react'
type LeadCommandCenterTabKey = 'workflow' | 'quotes' | 'activity'
type WorkflowActionKey = 'qualification' | 'coverage' | 'commercial' | 'follow_up'
type TaskUrgency = 'ON_TRACK' | 'DUE' | 'OVERDUE'

export type IconComponent = (props: SVGProps<SVGSVGElement>) => JSX.Element

type IconNode = {
  viewBox?: string
  paths: ReactNode
}

function createIcon(node: IconNode): IconComponent {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    const { className, ...rest } = props
    return (
      <svg
        viewBox={node.viewBox ?? '0 0 24 24'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...rest}
      >
        {node.paths}
      </svg>
    )
  }
}

export const CheckCircle = createIcon({
  paths: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </>
  ),
})

export const Clock = createIcon({
  paths: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3 1.8" />
    </>
  ),
})

export const AlertTriangle = createIcon({
  paths: (
    <>
      <path d="M12 4.5 20 18a1 1 0 0 1-.87 1.5H4.87A1 1 0 0 1 4 18l8-13.5Z" />
      <path d="M12 9v4.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
})

export const Snowflake = createIcon({
  paths: (
    <>
      <path d="M12 3v18" />
      <path d="m7.5 5.5 9 13" />
      <path d="m16.5 5.5-9 13" />
      <path d="m4.5 9 15 6" />
      <path d="m19.5 9-15 6" />
    </>
  ),
})

export const CalendarCheck = createIcon({
  paths: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 9.5h16" />
      <path d="m9.5 14 1.8 1.8 3.2-3.6" />
    </>
  ),
})

export const Sparkles = createIcon({
  paths: (
    <>
      <path d="m12 3 1.2 3.3L16.5 7.5l-3.3 1.2L12 12l-1.2-3.3L7.5 7.5l3.3-1.2L12 3Z" />
      <path d="m18 13 0.8 2.2L21 16l-2.2.8L18 19l-.8-2.2L15 16l2.2-.8L18 13Z" />
      <path d="m6 14 0.7 1.8L8.5 16.5l-1.8.7L6 19l-.7-1.8L3.5 16.5l1.8-.7L6 14Z" />
    </>
  ),
})

export const BadgeCheck = createIcon({
  paths: (
    <>
      <path d="M12 3.5 14.4 5l3-.2.8 2.9 2.3 1.8-1.2 2.7.3 3-2.6 1.4-1.4 2.6-3-.3-2.7 1.2-1.8-2.3-2.9-.8.2-3L3.5 12l1.5-2.4-.2-3 2.9-.8L9.5 3.5l2.5 1.2Z" />
      <path d="m9.2 12.1 1.9 1.9 3.7-4" />
    </>
  ),
})

export const Phone = createIcon({
  paths: (
    <>
      <path d="M8.2 5.5c.6-1 1.8-1.4 2.9-.9l1.5.7c.6.3 1 .9 1.1 1.6l.2 1.7c0 .5-.1 1-.5 1.4l-1 1c1 1.8 2.4 3.3 4.2 4.2l1-1c.4-.4.9-.5 1.4-.5l1.7.2c.7.1 1.3.5 1.6 1.1l.7 1.5c.5 1.1.1 2.3-.9 2.9l-1.4.8c-.9.5-2 .6-3 .2-2.8-1.1-5.3-2.9-7.3-4.9s-3.8-4.5-4.9-7.3c-.4-1-.3-2.1.2-3l.8-1.4Z" />
    </>
  ),
})

export const Package = createIcon({
  paths: (
    <>
      <path d="m12 3 7 3.5v11L12 21 5 17.5v-11L12 3Z" />
      <path d="M5 6.5 12 10l7-3.5" />
      <path d="M12 10v11" />
    </>
  ),
})

export const Handshake = createIcon({
  paths: (
    <>
      <path d="M8.5 11.5 11 14a2.2 2.2 0 0 0 3.1 0l2.1-2.1a2 2 0 0 0 0-2.9l-1.3-1.3a2.2 2.2 0 0 0-3.1 0L9 10.5" />
      <path d="m6.5 13.5 2.3 2.3a2 2 0 0 0 2.8 0l.7-.7" />
      <path d="m4.5 11.5 2.3 2.3" />
      <path d="m17.2 8.8 2.3 2.3" />
    </>
  ),
})

export const Trophy = createIcon({
  paths: (
    <>
      <path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" />
      <path d="M10 15h4" />
      <path d="M12 11v6" />
      <path d="M9 20h6" />
      <path d="M8 5H5.5A1.5 1.5 0 0 0 4 6.5 4.5 4.5 0 0 0 8.5 11" />
      <path d="M16 5h2.5A1.5 1.5 0 0 1 20 6.5 4.5 4.5 0 0 1 15.5 11" />
    </>
  ),
})

export const XCircle = createIcon({
  paths: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m9 9 6 6" />
      <path d="m15 9-6 6" />
    </>
  ),
})

export const Mail = createIcon({
  paths: (
    <>
      <rect x="4" y="6" width="16" height="12" rx="2" />
      <path d="m5 7 7 5 7-5" />
    </>
  ),
})

export const MessageCircle = createIcon({
  paths: (
    <>
      <path d="M7 17.5c-1.6-1.2-2.5-3.1-2.5-5.2 0-4 3.6-7.3 8-7.3s8 3.3 8 7.3-3.6 7.2-8 7.2c-1 0-2-.2-2.8-.5L5 20l2-2.5Z" />
    </>
  ),
})

export const Edit3 = createIcon({
  paths: (
    <>
      <path d="M4 20h4.2l9.8-9.8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
      <path d="m12.5 6.5 5 5" />
    </>
  ),
})

export const Paperclip = createIcon({
  paths: (
    <>
      <path d="M9 12.5 15.5 6a3 3 0 1 1 4.2 4.2l-8 8a5 5 0 1 1-7.1-7l8.2-8.3" />
    </>
  ),
})

export const ArrowUpRight = createIcon({
  paths: (
    <>
      <path d="M8 16 16 8" />
      <path d="M9 8h7v7" />
    </>
  ),
})

export const ExternalLink = createIcon({
  paths: (
    <>
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </>
  ),
})

export const Check = createIcon({
  paths: <path d="m7.5 12.5 3 3 6-7" />,
})

export const Calendar = createIcon({
  paths: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M4 9.5h16" />
    </>
  ),
})

export const LayoutDashboard = createIcon({
  paths: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="5" rx="1.5" />
      <rect x="13" y="11" width="7" height="9" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
})

export const Workflow = createIcon({
  paths: (
    <>
      <rect x="4" y="5" width="6" height="4" rx="1" />
      <rect x="14" y="5" width="6" height="4" rx="1" />
      <rect x="9" y="15" width="6" height="4" rx="1" />
      <path d="M10 7h4" />
      <path d="M17 9v2a3 3 0 0 1-3 3h-1" />
      <path d="M7 9v2a3 3 0 0 0 3 3h1" />
    </>
  ),
})

export const FileText = createIcon({
  paths: (
    <>
      <path d="M8 4h6l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M14 4v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h6" />
    </>
  ),
})

export const Activity = createIcon({
  paths: (
    <>
      <path d="M4 12h3l2-5 4 10 2-5h5" />
    </>
  ),
})

export const Kanban = createIcon({
  paths: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M10 5v14" />
      <path d="M14 5v14" />
      <path d="M7 8v3" />
      <path d="M12 8v6" />
      <path d="M17 8v4" />
    </>
  ),
})

export const ListChecks = createIcon({
  paths: (
    <>
      <path d="M9 6h10" />
      <path d="M9 12h10" />
      <path d="M9 18h10" />
      <path d="m4.5 6 1.3 1.3L7.8 5" />
      <path d="m4.5 12 1.3 1.3 2-2.3" />
      <path d="m4.5 18 1.3 1.3 2-2.3" />
    </>
  ),
})

export const ICON_CONTAINER_CLASS = 'rounded-md bg-white/70 p-1.5 shadow-[0_2px_4px_rgba(0,0,0,0.15)] backdrop-blur-sm dark:bg-neutral-200/10'

export const designTokens = {
  stage: {
    new: '#3B82F6',
    qualified: '#22C55E',
    contacted: '#6366F1',
    sample: '#F59E0B',
    negotiation: '#A855F7',
    won: '#10B981',
    lost: '#EF4444',
  },
  status: {
    ready: '#16A34A',
    progress: '#FACC15',
    blocked: '#DC2626',
    cold: '#9CA3AF',
    ontrack: '#3B82F6',
  },
} as const

export function getStageKey(label?: string | null): keyof typeof designTokens.stage {
  const normalized = String(label ?? '').trim().toLowerCase()
  if (normalized.includes('qualif')) return 'qualified'
  if (normalized.includes('contact')) return 'contacted'
  if (normalized.includes('sample')) return 'sample'
  if (normalized.includes('negoti')) return 'negotiation'
  if (normalized.includes('won')) return 'won'
  if (normalized.includes('lost')) return 'lost'
  return 'new'
}

export function getStageAccent(label?: string | null) {
  return designTokens.stage[getStageKey(label)]
}

export function getStageIcon(label?: string | null): IconComponent {
  switch (getStageKey(label)) {
    case 'qualified':
      return BadgeCheck
    case 'contacted':
      return Phone
    case 'sample':
      return Package
    case 'negotiation':
      return Handshake
    case 'won':
      return Trophy
    case 'lost':
      return XCircle
    default:
      return Sparkles
  }
}

export function getStatusIcon(status: 'ready' | 'progress' | 'blocked' | 'cold' | 'ontrack'): IconComponent {
  switch (status) {
    case 'ready':
      return CheckCircle
    case 'progress':
      return Clock
    case 'blocked':
      return AlertTriangle
    case 'cold':
      return Snowflake
    default:
      return CalendarCheck
  }
}

export function getTabIcon(tab: LeadCommandCenterTabKey): IconComponent {
  switch (tab) {
    case 'workflow':
      return Workflow
    case 'quotes':
      return FileText
    case 'activity':
      return Activity
    default:
      return Workflow
  }
}

export function getWorkflowIcon(key: WorkflowActionKey): IconComponent {
  switch (key) {
    case 'qualification':
      return BadgeCheck
    case 'coverage':
      return Kanban
    case 'commercial':
      return FileText
    case 'follow_up':
      return ArrowUpRight
  }
}

export function getActionIcon(action: 'call' | 'email' | 'whatsapp' | 'add_note' | 'add_file' | 'follow_up' | 'open' | 'complete' | 'reschedule'): IconComponent {
  switch (action) {
    case 'call':
      return Phone
    case 'email':
      return Mail
    case 'whatsapp':
      return MessageCircle
    case 'add_note':
      return Edit3
    case 'add_file':
      return Paperclip
    case 'follow_up':
      return ArrowUpRight
    case 'complete':
      return Check
    case 'reschedule':
      return Calendar
    default:
      return ExternalLink
  }
}

export function getUrgencyStatus(urgency: TaskUrgency): 'ready' | 'progress' | 'blocked' | 'cold' | 'ontrack' {
  switch (urgency) {
    case 'OVERDUE':
      return 'blocked'
    case 'DUE':
      return 'progress'
    default:
      return 'ontrack'
  }
}
