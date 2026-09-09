import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const MANAGEMENT_ROLES = new Set(['owner', 'manager', 'admin']);
const ASSIGNABLE_ROLES = new Set(['owner', 'manager', 'admin', 'sales', 'field_sales']);
const MAX_ROWS = 500;

type ImportRow = {
  contactName?: string;
  company?: string;
  mobile?: string;
  email?: string;
  city?: string;
  requirement?: string;
  notes?: string;
  assignedTo?: string;
  source?: string;
};

type PreviewRow = {
  row: number;
  status: 'ready' | 'duplicate' | 'error';
  message: string;
  ownerUserId: string | null;
  ownerName: string | null;
};

function clean(value: unknown, max = 2000) {
  return String(value ?? '').trim().slice(0, max);
}

function normalizePhone(value: unknown) {
  return clean(value, 80).replace(/\D/g, '');
}

function normalizeEmail(value: unknown) {
  return clean(value, 254).toLowerCase();
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  const workspace = await requireWorkspace();
  if (!workspace.organization || !workspace.user || !workspace.membership) {
    return NextResponse.json({ error: 'Workspace access required.' }, { status: 401 });
  }
  if (workspace.organization.id !== STARK_PACKMATE_ORG_ID) {
    return NextResponse.json({ error: 'Lead import is currently enabled for Stark Packmate.' }, { status: 403 });
  }

  const roles = workspace.currentRoles.map((role) => String(role).trim().toLowerCase());
  const isFieldSales = roles.includes('field_sales');
  const canManageAssignments = roles.some((role) => MANAGEMENT_ROLES.has(role));
  if (!isFieldSales && !canManageAssignments) {
    return NextResponse.json({ error: 'Owner, Manager, Admin or Field Sales access is required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { action?: 'preview' | 'commit'; rows?: ImportRow[]; assignUserId?: string | null; fileName?: string | null } | null;
  const rows = Array.isArray(body?.rows) ? body!.rows : [];
  if (!rows.length) return NextResponse.json({ error: 'No import rows were provided.' }, { status: 400 });
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `V1 imports are limited to ${MAX_ROWS} rows per file.` }, { status: 400 });

  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 500 });

  const { data: members, error: membersError } = await db
    .from('organization_members')
    .select('user_id, is_active, profiles(email, full_name), user_roles(roles(name))')
    .eq('organization_id', workspace.organization.id)
    .eq('is_active', true);
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 });

  const memberDirectory = (members ?? []).map((member: any) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    const roleNames = (member.user_roles ?? []).map((item: any) => String(item?.roles?.name ?? '').toLowerCase()).filter(Boolean);
    return {
      userId: String(member.user_id ?? ''),
      email: normalizeEmail(profile?.email),
      name: clean(profile?.full_name, 160),
      normalizedName: clean(profile?.full_name, 160).toLowerCase(),
      roles: roleNames,
    };
  }).filter((member: any) => member.userId && member.roles.some((role: string) => ASSIGNABLE_ROLES.has(role)));

  const currentMember = memberDirectory.find((member: any) => member.userId === workspace.user!.id) ?? null;
  let defaultOwner = currentMember;
  const assignUserId = clean(body?.assignUserId, 80);
  if (isFieldSales) {
    defaultOwner = currentMember;
  } else if (assignUserId) {
    defaultOwner = memberDirectory.find((member: any) => member.userId === assignUserId) ?? null;
    if (!defaultOwner) return NextResponse.json({ error: 'Selected assignee is not an active Stark Packmate Owner, Manager, Admin, Sales or Field Sales user.' }, { status: 400 });
  }

  const { data: existing, error: existingError } = await db
    .from('leads')
    .select('id, phone, whatsapp_number, email')
    .eq('organization_id', workspace.organization.id);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const existingPhones = new Map<string, string>();
  const existingEmails = new Map<string, string>();
  for (const lead of existing ?? []) {
    for (const candidate of [lead.phone, lead.whatsapp_number]) {
      const normalized = normalizePhone(candidate);
      if (normalized) existingPhones.set(normalized, String(lead.id));
    }
    const email = normalizeEmail(lead.email);
    if (email) existingEmails.set(email, String(lead.id));
  }

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const errors: Array<{ row: number; message: string }> = [];
  const duplicates: Array<{ row: number; message: string; leadId?: string | null }> = [];
  const previewRows: PreviewRow[] = [];
  const inserts: any[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const contactName = clean(row.contactName, 160);
    const mobile = normalizePhone(row.mobile);
    const email = normalizeEmail(row.email);
    const rowErrors: string[] = [];
    if (!contactName) rowErrors.push('Contact Name is required.');
    if (!mobile) rowErrors.push('Mobile is required.');
    else if (mobile.length < 7) rowErrors.push('Mobile number is not valid.');
    if (!validEmail(email)) rowErrors.push('Email format is not valid.');

    let owner = defaultOwner;
    const assignedTo = clean(row.assignedTo, 160).toLowerCase();
    if (isFieldSales) {
      if (!owner) rowErrors.push('Your Field Sales account could not be resolved as an active Stark member.');
      if (assignedTo && owner && assignedTo !== owner.email && assignedTo !== owner.normalizedName && assignedTo !== owner.userId.toLowerCase()) {
        rowErrors.push('Field Sales imports can only be assigned to your own account.');
      }
    } else if (!assignUserId && assignedTo) {
      const matches = memberDirectory.filter((member: any) => member.email === assignedTo || member.normalizedName === assignedTo || member.userId.toLowerCase() === assignedTo);
      owner = matches.length === 1 ? matches[0] : null;
      if (!owner) rowErrors.push(`Assigned To '${clean(row.assignedTo, 160)}' does not uniquely match an active Stark assignee.`);
    }
    if (!owner) rowErrors.push('A valid lead owner is required.');

    const existingLeadId = existingPhones.get(mobile) ?? (email ? existingEmails.get(email) : undefined) ?? null;
    const duplicateInFile = (mobile && seenPhones.has(mobile)) || (email && seenEmails.has(email));
    if (mobile) seenPhones.add(mobile);
    if (email) seenEmails.add(email);

    if (rowErrors.length) {
      const message = rowErrors.join(' ');
      errors.push({ row: rowNumber, message });
      previewRows.push({ row: rowNumber, status: 'error', message, ownerUserId: owner?.userId ?? null, ownerName: owner?.name ?? null });
      return;
    }
    if (existingLeadId || duplicateInFile) {
      const message = existingLeadId ? 'Possible duplicate by Mobile or Email already exists in CRM.' : 'Possible duplicate by Mobile or Email appears earlier in this file.';
      duplicates.push({ row: rowNumber, message, leadId: existingLeadId });
      previewRows.push({ row: rowNumber, status: 'duplicate', message, ownerUserId: owner.userId, ownerName: owner.name });
      return;
    }

    previewRows.push({ row: rowNumber, status: 'ready', message: clean(row.company) ? 'Ready' : 'Ready · Company recommended', ownerUserId: owner.userId, ownerName: owner.name });
    inserts.push({
      organization_id: workspace.organization!.id,
      lead_type: 'buyer',
      owner_user_id: owner.userId,
      created_by: workspace.user!.id,
      updated_by: workspace.user!.id,
      company_name: clean(row.company, 200) || contactName,
      contact_name: contactName,
      phone: clean(row.mobile, 80),
      whatsapp_number: clean(row.mobile, 80),
      email: email || null,
      products_or_needs: clean(row.requirement, 1000) || null,
      notes: clean(row.notes) || null,
      source_type: 'import',
      source_label: clean(row.source, 160) || (isFieldSales ? 'Field Sales Import' : 'Existing Prospect List'),
      industry_metadata: {
        city: clean(row.city, 120) || null,
        import_source: clean(row.source, 160) || (isFieldSales ? 'Field Sales Import' : 'Existing Prospect List'),
      },
    });
  });

  const summary = { found: rows.length, ready: inserts.length, duplicates: duplicates.length, corrections: errors.length };
  if (body?.action !== 'commit') {
    return NextResponse.json({ imported: 0, ...summary, errors, duplicates, previewRows });
  }
  if (!inserts.length) return NextResponse.json({ imported: 0, ...summary, errors, duplicates, previewRows }, { status: 400 });

  const startedAt = new Date().toISOString();
  const { data: importRun, error: runError } = await db.from('import_runs').insert({
    organization_id: workspace.organization.id,
    import_type: 'leads',
    source_file_name: clean(body?.fileName, 255) || 'lead-import',
    status: 'running',
    started_by: workspace.user.id,
    rows_read: summary.found,
    rows_valid: summary.ready,
    rows_warning: summary.duplicates,
    rows_blocked: summary.corrections,
    summary_payload: { source: 'capture_lead_import', preview: summary },
  }).select('id').single();
  if (runError) return NextResponse.json({ error: `Unable to create import audit record: ${runError.message}` }, { status: 500 });

  const insertsWithRun = inserts.map((lead) => ({
    ...lead,
    industry_metadata: { ...lead.industry_metadata, import_run_id: importRun.id, imported_at: startedAt },
  }));
  const { data: inserted, error } = await db.from('leads').insert(insertsWithRun).select('id');
  if (error) {
    await db.from('import_runs').update({ status: 'failed', completed_at: new Date().toISOString(), summary_payload: { source: 'capture_lead_import', preview: summary, error: error.message } }).eq('id', importRun.id);
    return NextResponse.json({ error: error.message, ...summary, errors, duplicates, previewRows }, { status: 500 });
  }

  const imported = inserted?.length ?? insertsWithRun.length;
  await db.from('import_runs').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    rows_inserted: imported,
    summary_payload: { source: 'capture_lead_import', preview: summary, imported },
  }).eq('id', importRun.id);

  return NextResponse.json({ imported, importRunId: importRun.id, ...summary, errors, duplicates, previewRows });
}
