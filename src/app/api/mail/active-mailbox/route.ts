import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { ACTIVE_MAILBOX_COOKIE, listUserMailboxes, resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { isMailId } from '@/lib/mail/organization';

export const dynamic = 'force-dynamic';

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user) return { error: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }) } as const;
  if (!workspace.organization || !workspace.membership) return { error: NextResponse.json({ error: 'Active workspace required.' }, { status: 403 }) } as const;
  const db = (await createClient()) as any;
  const organizationId = workspace.organization.id;
  const userId = workspace.user.id;
  const [grant, product] = await Promise.all([
    db.from('org_module_grants').select('enabled').eq('organization_id', organizationId).eq('module_key', 'setu_mail').maybeSingle(),
    db.from('organization_member_product_access').select('crm_enabled,mail_enabled').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle(),
  ]);
  if (grant.error || product.error) return { error: NextResponse.json({ error: 'Unable to verify product access.' }, { status: 503 }) } as const;
  if (!grant.data?.enabled || product.data?.mail_enabled === false) return { error: NextResponse.json({ error: 'Setu Mail access is not enabled.' }, { status: 403 }) } as const;
  return { workspace, db, organizationId, userId, crmEnabled: product.data?.crm_enabled !== false } as const;
}

export async function GET() {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  try {
    const [mailboxes, active] = await Promise.all([
      listUserMailboxes(ctx.db, ctx.organizationId, ctx.userId),
      resolveUserMailbox(ctx.db, ctx.organizationId, ctx.userId),
    ]);
    return NextResponse.json({
      activeMailboxId: active?.id ?? null,
      crmEnabled: ctx.crmEnabled,
      mailboxes: mailboxes.map(({ id, address, display_name, is_primary, can_read, can_send, can_manage }) => ({ id, address, display_name: display_name ?? null, is_primary, can_read, can_send, can_manage })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to load assigned mailboxes.' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await context();
  if ('error' in ctx) return ctx.error;
  const contentType = request.headers.get('content-type') ?? '';
  let mailboxId: string | null = null;
  if (contentType.includes('application/json')) {
    const body = await request.json().catch(() => null) as { mailboxId?: string } | null;
    mailboxId = body?.mailboxId ?? null;
  } else {
    const form = await request.formData().catch(() => null);
    mailboxId = form ? String(form.get('mailboxId') ?? '') : null;
  }
  if (!isMailId(mailboxId)) return NextResponse.json({ error: 'Choose a valid mailbox.' }, { status: 400 });
  try {
    const mailboxes = await listUserMailboxes(ctx.db, ctx.organizationId, ctx.userId);
    const target = mailboxes.find((mailbox) => mailbox.id === mailboxId);
    if (!target?.can_read) return NextResponse.json({ error: 'You do not have access to this mailbox.' }, { status: 403 });
    const wantsHtml = !contentType.includes('application/json');
    const response = wantsHtml
      ? NextResponse.redirect(new URL('/mail', request.url), 303)
      : NextResponse.json({ ok: true, activeMailboxId: target.id });
    response.cookies.set(ACTIVE_MAILBOX_COOKIE, target.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Unable to switch mailboxes.' }, { status: 503 });
  }
}
