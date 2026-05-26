/**
 * GET /api/internal/auth-check
 *
 * Server-side auth verification for static internal HTML pages.
 *
 * Why this exists:
 *   Static HTML in /public uses supabase-js (browser client) which reads
 *   from localStorage. The CRM login flow uses @supabase/ssr which stores
 *   the session in HTTP cookies. The browser client cannot reliably read
 *   these cookies. This route runs in the Next.js server context where
 *   @supabase/ssr can read the cookies correctly.
 *
 * Returns:
 *   200 { authenticated: true, user, access_token, refresh_token }
 *   401 { authenticated: false }            — no session
 *   403 { authenticated: false, reason }    — session exists but not SETU Flow org member
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const SETU_FLOW_ORG_ID = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    // getUser() validates the JWT server-side (more secure than getSession())
    const { data: { user }, error: userErr } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Verify SETU Flow org membership
    const { data: membership, error: memErr } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', SETU_FLOW_ORG_ID)
      .maybeSingle();

    if (memErr || !membership) {
      return NextResponse.json(
        { authenticated: false, reason: 'not_org_member' },
        { status: 403 },
      );
    }

    // Get profile for display name — cast to any to bypass generated-type narrowing
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const profile = profileData as { full_name?: string | null } | null;

    // Get session tokens so the browser Supabase client can authenticate
    // for RLS-protected data queries (e.g. roadmap_items)
    const { data: { session } } = await supabase.auth.getSession();

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: profile?.full_name || user.email || 'SETU Flow Member',
        email: user.email,
      },
      // Return tokens so the browser supabase client can call setSession()
      // The access_token is a short-lived signed JWT — safe to return to the
      // authenticated user since it's already in their browser cookies.
      access_token: session?.access_token ?? null,
      refresh_token: session?.refresh_token ?? null,
    });
  } catch (err) {
    console.error('[/api/internal/auth-check]', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
