export type MobileLeadStatus = string;
export type MobileUserRole = 'owner' | 'admin' | 'manager' | 'member';
export type MobileLeadType = 'buyer' | 'supplier' | '';

export type MobileLead = {
  id: string;
  company: string;
  contact: string;
  ownerName: string;
  assignedUserId: string;
  managerUserId?: string | null;
  teamId: string;
  teamName: string;
  status: MobileLeadStatus;
  nextAction: string;
  valueUsd: number;
  market: string;
  productInterest: string;
  lastActivity: string;
  leadType?: MobileLeadType;
  // SF-18-118: Premium UX fields
  nextFollowUpAt?: string | null;
  dealValue?: number | null;
};

export type MobileUserContext = {
  id: string;
  name: string;
  role: MobileUserRole;
  managedTeamIds?: string[];
  directReportIds?: string[];
};

export type LeadFilter = {
  query?: string;
  status?: 'All' | MobileLeadStatus;
  leadType?: MobileLeadType;
};

export const mobileLeadDemoData: MobileLead[] = [
  { id: 'L-MOB-001', company: 'Aster Retail LLC', contact: 'Maya Khan', ownerName: 'Ritesh Kapoor', assignedUserId: 'u-owner', teamId: 't-gulf', teamName: 'Gulf Growth', status: 'Quoted', nextAction: 'Review quote terms', valueUsd: 3720, market: 'UAE', productInterest: 'Vacuum Mango Chips', lastActivity: '12m ago', leadType: 'buyer' },
  { id: 'L-MOB-002', company: 'Nova Foods', contact: 'Aarav Menon', ownerName: 'Priya Mehta', assignedUserId: 'u-priya', managerUserId: 'u-manager', teamId: 't-gulf', teamName: 'Gulf Growth', status: 'Follow-up', nextAction: 'Send samples', valueUsd: 5400, market: 'Saudi Arabia', productInterest: 'Premium fruit chips', lastActivity: '1h ago', leadType: 'buyer' },
  { id: 'L-MOB-003', company: 'Global Source Partners', contact: 'Rohan Shah', ownerName: 'Omar Saleh', assignedUserId: 'u-omar', managerUserId: 'u-manager', teamId: 't-sourcing', teamName: 'Sourcing', status: 'Qualified', nextAction: 'Confirm MOQ', valueUsd: 9200, market: 'India', productInterest: 'Freeze-dried fruit lines', lastActivity: '2h ago', leadType: 'supplier' },
  { id: 'L-MOB-004', company: 'Blue Harbor Imports', contact: 'Elena Park', ownerName: 'Nina Patel', assignedUserId: 'u-nina', managerUserId: 'u-other-manager', teamId: 't-europe', teamName: 'Europe', status: 'At risk', nextAction: 'Escalate pricing', valueUsd: 12800, market: 'UK', productInterest: 'Private label snacks', lastActivity: 'Yesterday', leadType: 'buyer' },
  { id: 'L-MOB-005', company: 'Palm Route Trading', contact: 'Samir Ali', ownerName: 'Ritesh Kapoor', assignedUserId: 'u-owner', teamId: 't-gulf', teamName: 'Gulf Growth', status: 'New', nextAction: 'Capture requirements', valueUsd: 2600, market: 'Qatar', productInterest: 'Jaggery and natural sweeteners', lastActivity: 'Today', leadType: 'supplier' }
];

export const mobileLeadDemoUsers = {
  owner: { id: 'u-owner', name: 'Owner view', role: 'owner' as const },
  admin: { id: 'u-admin', name: 'Admin view', role: 'admin' as const },
  manager: { id: 'u-manager', name: 'Manager view', role: 'manager' as const, managedTeamIds: ['t-sourcing'], directReportIds: ['u-priya', 'u-omar'] },
  member: { id: 'u-priya', name: 'Member view', role: 'member' as const }
};

export function canViewLead(lead: MobileLead, user: MobileUserContext) {
  if (user.role === 'owner' || user.role === 'admin') return true;
  if (user.role === 'manager') {
    return lead.managerUserId === user.id || lead.assignedUserId === user.id || Boolean(user.managedTeamIds?.includes(lead.teamId)) || Boolean(user.directReportIds?.includes(lead.assignedUserId));
  }
  return lead.assignedUserId === user.id;
}

export function filterLeadsForRole(leads: MobileLead[], user: MobileUserContext, filter: LeadFilter = {}) {
  const query = (filter.query ?? '').trim().toLowerCase();
  return leads.filter((lead) => {
    if (!canViewLead(lead, user)) return false;
    if (filter.leadType && lead.leadType !== filter.leadType) return false;
    if (filter.status && filter.status !== 'All' && lead.status !== filter.status) return false;
    if (!query) return true;
    return [lead.company, lead.contact, lead.ownerName, lead.teamName, lead.status, lead.nextAction, lead.market, lead.productInterest].some((value) => value.toLowerCase().includes(query));
  });
}

export function workspaceRolesToMobileRole(roles: readonly string[] = []): MobileUserRole {
  const normalized = roles.map((role) => role.toLowerCase());
  if (normalized.includes('owner')) return 'owner';
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('manager')) return 'manager';
  return 'member';
}
