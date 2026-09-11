import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';

export const dynamic = 'force-dynamic';

async function context() {
  const workspace = await getCurrentWorkspace();
  if (!workspace.user || !workspace.organization || !workspace.membership) return null;
  const supabase = (await createClient()) as any;
  const mailbox = await resolveUserMailbox(supabase, workspace.organization.id, workspace.user.id, 'id,address,status');
  if (!mailbox) return null;
  return { workspace, supabase, mailbox, organizationId: workspace.organization.id, userId: workspace.user.id };
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Active Setu Mail mailbox required.' }, { status: 403 });
  const { data: signature } = await ctx.supabase.from('mail_signatures').select('*').eq('mailbox_id', ctx.mailbox.id).eq('user_id', ctx.userId).eq('is_default', true).limit(1).maybeSingle();
  return NextResponse.json({ mailbox: ctx.mailbox, signature: signature ?? null });
}

export async function PUT(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: 'Active Setu Mail mailbox required.' }, { status: 403 });
  const body = await request.json().catch(() => null) as { name?: string; text?: string; html?: string } | null;
  const text = String(body?.text ?? '').slice(0, 10000);
  const html = String(body?.html ?? '').slice(0, 20000);
  const name = String(body?.name ?? 'Default').trim().slice(0, 100) || 'Default';
  const { data: existing } = await ctx.supabase.from('mail_signatures').select('id').eq('mailbox_id', ctx.mailbox.id).eq('user_id', ctx.userId).eq('is_default', true).limit(1).maybeSingle();
  const values = { organization_id: ctx.organizationId, mailbox_id: ctx.mailbox.id, user_id: ctx.userId, name, text_signature: text || null, html_signature: html || null, is_default: true, updated_at: new Date().toISOString() };
  const query = existing?.id ? ctx.supabase.from('mail_signatures').update(values).eq('id', existing.id) : ctx.supabase.from('mail_signatures').insert(values);
  const { data, error } = await query.select('*').single();
  if (error) return NextResponse.json({ error: 'Unable to save mail signature.' }, { status: 500 });
  return NextResponse.json({ ok: true, signature: data });
}
