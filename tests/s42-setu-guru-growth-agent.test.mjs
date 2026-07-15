import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260710203000_s42_guru_002_ai_recommendations.sql', 'utf8');
const generator = readFileSync('src/lib/setu-guru/recommendation-generator.ts', 'utf8');
const triggerRoute = readFileSync('src/app/api/setu-guru/recommendations/generate/route.ts', 'utf8');
const query = readFileSync('src/lib/setu-guru/recommendations.ts', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');