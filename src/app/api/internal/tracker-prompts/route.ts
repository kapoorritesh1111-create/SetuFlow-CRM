import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type TrackerPromptRow = {
  id: string;
  prompt_key: string;
  title: string | null;
  prompt_text: string | null;
  version: number | null;
  is_active: boolean | null;
};

type TrackerPromptQuery = {
  select: (columns: string) => TrackerPromptQuery;
  eq: (column: string, value: unknown) => TrackerPromptQuery;
  maybeSingle: () => Promise<{ data: TrackerPromptRow | null; error: { message?: string } | null }>;
};

type TrackerPromptWriteQuery = {
  select: () => TrackerPromptWriteQuery;
  single: () => Promise<{ data: TrackerPromptRow | null; error: { message?: string } | null }>;
};

type TrackerPromptTable = {
  select: (columns: string) => TrackerPromptQuery;
  insert: (value: Record<string, unknown>) => TrackerPromptWriteQuery;
  update: (value: Record<string, unknown>) => { eq: (column: string, value: unknown) => TrackerPromptWriteQuery };
};

type TrackerPromptClient = {
  from: (table: 'tracker_prompts') => TrackerPromptTable;
};

const PROMPT_KEY = 'chatgpt_fix_protocol';

const payloadSchema = z.object({
  title: z.string().trim().min(1).max(120).default('ChatGPT Issue Fix Protocol'),
  prompt_text: z.string().trim().min(20).max(50000),
});

function promptTable(client: unknown) {
  return (client as TrackerPromptClient).from('tracker_prompts');
}

async function assertInternalAccess() {
  const access = await getWorkspaceAccess();
  if (!access.user || !access.membership) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const authError = await assertInternalAccess();
  if (authError) return authError;

  const supabase = await createClient();
  const { data, error } = await promptTable(supabase)
    .select('id,prompt_key,title,prompt_text,version,is_active')
    .eq('prompt_key', PROMPT_KEY)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message ?? 'Prompt lookup failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prompt: data });
}

export async function PUT(request: Request) {
  const authError = await assertInternalAccess();
  if (authError) return authError;

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid prompt payload' }, { status: 400 });
  }

  const supabase = await createClient();
  const table = promptTable(supabase);
  const existing = await table
    .select('id,prompt_key,title,prompt_text,version,is_active')
    .eq('prompt_key', PROMPT_KEY)
    .maybeSingle();

  if (existing.error) {
    return NextResponse.json({ ok: false, error: existing.error.message ?? 'Prompt lookup failed' }, { status: 500 });
  }

  const nextVersion = Number(existing.data?.version ?? 0) + 1;
  const row = {
    prompt_key: PROMPT_KEY,
    title: parsed.data.title,
    prompt_text: parsed.data.prompt_text,
    version: nextVersion,
    is_active: true,
  };

  const result = existing.data?.id
    ? await table.update(row).eq('id', existing.data.id).select().single()
    : await table.insert({ id: crypto.randomUUID(), ...row }).select().single();

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message ?? 'Prompt save failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, prompt: result.data });
}
