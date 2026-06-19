import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const dynamic = "force-dynamic";

// Count of guest sessions whose most recent message is from the guest (i.e. awaiting a team reply).
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ awaiting: 0 });
    const sb = supabase as any;
    const { data: links } = await sb.from('guest_links').select('id, revoked_at, expires_at').eq('organization_id', INTERNAL_ORG_ID);
    const active = (links ?? []).filter((l: any) => !l.revoked_at && !(l.expires_at && new Date(l.expires_at).getTime() < Date.now()));
    if (active.length === 0) return NextResponse.json({ awaiting: 0 });
    const ids = active.map((l: any) => l.id);
    const { data: msgs } = await sb.from('guest_chat_messages').select('guest_link_id, sender_kind, created_at').in('guest_link_id', ids).order('created_at', { ascending: true });
    const lastSender: Record<string, string> = {};
    for (const m of (msgs ?? []) as any[]) lastSender[m.guest_link_id] = m.sender_kind;
    const awaiting = Object.values(lastSender).filter((s) => s === 'guest').length;
    return NextResponse.json({ awaiting });
  } catch {
    return NextResponse.json({ awaiting: 0 });
  }
}
