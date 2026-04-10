import { createHash, randomBytes } from 'node:crypto';
import { env } from '@/lib/env';

export function createInvitationToken() {
  return randomBytes(24).toString('base64url');
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function buildInvitationAcceptUrl(token: string) {
  const base = env.appUrl?.replace(/\/$/, '') || 'https://www.setuflowcrm.com';
  return `${base}/invite/${encodeURIComponent(token)}`;
}
