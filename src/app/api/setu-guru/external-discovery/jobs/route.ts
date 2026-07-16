import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const CreateJobSchema = z.object({
  campaignId: z.string().uuid(),
  providerKey: z.string().trim().min(2).