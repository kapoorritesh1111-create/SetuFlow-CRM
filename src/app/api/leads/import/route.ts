import { NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const MANAGEMENT_ROLES = new Set(['owner', 'manager', 'admin']);

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

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalizePhone(value: unknown) {
  return clean(value).replace(/[^+\d]/g, '');
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
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

  const body = await request.json().catch(() => null) as { rows?: ImportRow[]; assignUserId?: string | null } | null;
  const rows = Array.isArray(body?.rows) ? body!.rows.slice(0, 1000) : [];
  if (!rows.length) return NextResponse.json({ error: 'No import rows were provided.' }, { status: 400 });

  const db = createAdminSupabaseClient() as any;
  if (!db) return NextResponse.json({ error: 'Database admin client unavailable.' }, { status: 500 });

  let defaultOwnerUserId = workspace.user.id;
  if (canManageAssignments && clean(body?.assignUserId)) {
    const requestedUserId = clean(body?.assignUserId);
    const { data: member } = await db
      .from('organization_members')
      .select('user_id, is_active')
      .eq('organization_id', workspace.organization.id)
      .eq('user_id', requestedUserId)
      .eq('is_active', true)
      .maybeSingle();
    if (!member?.user_id) return NextResponse.json({ error: 'Selected assignee is not an active Stark Packmate user.' }, { status: 400 });
    defaultOwnerUserId = member.user_id;
  }

  const { data: members } = await db
    .from('organization_members')
    .select('user_id, is_active, profiles(email, full_name), user_roles(roles(name))')
    .eq('organization_id', workspace.organization.id)
    .eq('is_active', true);

  const memberDirectory = (members ?? []).map((member: any) => {
    const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
    const roleNames = (member.user_roles ?? []).map((item: any) => String(item?.roles?.name ?? '').toLowerCase()).filter(Boolean);
    return {
      userId: member.user_id as string,
      email: normalizeEmail(profile?.email),
      name: clean(profile?.full_name).toLowerCase(),
      roles: roleNames,
    };
  });

  const incomingEmails = Array.from(new Set(rows.map((row) => normalizeEmail(row.email)).filter(Boolean)));
  const incomingPhones = Array.from(new Set(rows.map((row) => normalizePhone(row.mobile)).filter(Boolean)));

  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();
  if (incomingEmails.length) {
    const { data } = await db.from('leads').select('email').eq('organization_id', workspace.organization.id).in('email', incomingEmails);
    for (const item of data ?? []) if (item.email) existingEmails.add(normalizeEmail(item.email));
  }
  if (incomingPhones.length) {
    const { data } = await db.from('leads').select('phone, whatsapp_number').eq('organization_id', workspace.organization.id).or(`phone.in.(${incomingPhones.map((value) => `"${value}"`).join(',')}),whatsapp_number.in.(${incomingPhones.map((value) => `"${value}"`).join(',')})`);
    for (const item of data ?? []) {
      if (item.phone) existingPhones.add(normalizePhone(item.phone));
      if (item.whatsapp_number) existingPhones.add(normalizePhone(item.whatsapp_number));
    }
  }

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const errors: Array<{ row: number; message: string }> = [];
  const duplicates: Array<{ row: number; message: string }> = [];
  const inserts: any[] = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const contactName = clean(row.contactName);
    const mobile = normalizePhone(row.mobile);
    const email = normalizeEmail(row.email);
    if (!contactName) {
      errors.push({ row: rowNumber, message: 'Contact Name is required.' });
      return;
    }
    if (!mobile) {
      errors.push({ row: rowNumber, message: 'Mobile is required.' });
      return;
    }
    if ((email && existingEmails.has(email)) || existingPhones.has(mobile) || (email && seenEmails.has(email)) || seenPhones.has(mobile)) {
      duplicates.push({ row: rowNumber, message: 'Possible duplicate by email or mobile.' });
      return;
    }

    let ownerUserId = defaultOwnerUserId;
    const assignedTo = clean(row.assignedTo).toLowerCase();
    if (!isFieldSales && assignedTo) {
      const matched = memberDirectory.find((member: any) => member.email === assignedTo || member.name === assignedTo);
      if (!matched) {
        errors.push({ row: rowNumber, message: `Assigned To '${clean(row.assignedTo)}' is not an active Stark Packmate user.` });
        return;
      }
      ownerUserId = matched.userId;
    }

    seenPhones.add(mobile);
    if (email) seenEmails.add(email);
    inserts.push({
      organization_id: workspace.organization!.id,
      lead_type: 'buyer',
      owner_user_id: ownerUserId,
      created_by: workspace.user!.id,
      updated_by: workspace.user!.id,
      company_name: clean(row.company) || contactName,
      contact_name: contactName,
      phone: mobile,
      whatsapp_number: mobile,
      email: email || null,
      products_or_needs: clean(row.requirement) || null,
      notes: clean(row.notes) || null,
      source_type: 'import',
      source_label: clean(row.source) || 'Field Sales Import',
      industry_metadata: clean(row.city) ? { city: clean(row.city), import_source: clean(row.source) || 'Field Sales Import' } : { import_source: clean(row.source) || 'Field Sales Import' },
    });
  });

  if (!inserts.length) {
    return NextResponse.json({ imported: 0, ready: 0, errors, duplicates }, { status: 400 });
  }

  const { data: inserted, error } = await db.from('leads').insert(inserts).select('id');
  if (error) return NextResponse.json({ error: error.message, errors, duplicates }, { status: 500 });

  return NextResponse.json({
    imported: inserted?.length ?? inserts.length,
    ready: inserts.length,
    errors,
    duplicates,
  });
}
