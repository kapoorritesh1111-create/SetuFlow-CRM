import { createClient } from '@supabase/supabase-js';
import { env, hasSupabaseServiceRole } from '@/lib/env';

export function createServiceClient() {
  if (!hasSupabaseServiceRole) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
