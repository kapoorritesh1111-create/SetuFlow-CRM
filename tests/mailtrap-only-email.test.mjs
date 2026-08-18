import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const invitationEmail = readFileSync('src/features/admin/server/invitation-email.ts', 'utf8');
const onboardingEmail = readFileSync('src/features/client-onboarding/server/notifications.ts', 'utf8');
const demoRoute = readFileSync('src/app/api/book-demo/route.ts', 'utf8');
const roiRoute = readFileSync('src/app/api/roi-report/route.ts', 'utf