import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseServiceRole } from '@/lib/env';
import type { Database } from '@/types/database';

export function createAdminSupabaseClient() {
  if (!hasSupabaseServiceRole) {
    return null;
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
