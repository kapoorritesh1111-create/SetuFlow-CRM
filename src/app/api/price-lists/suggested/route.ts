import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { resolveProductPricing } from '@/lib/catalog-share/pricing-resolver';

export const dynamic = 'force-dynamic';

function clean(value: unknown, fallback = '') {
  return String(value ?? fallback).trim();
}

function priceForIncoterm(pricing