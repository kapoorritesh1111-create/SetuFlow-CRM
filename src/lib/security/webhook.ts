import { createHmac, timingSafeEqual } from 'crypto';

function normalizeSignature(signature: string) {
  const trimmed = signature.trim();
  if (!trimmed) return null;

  const value = trimmed.startsWith('sha256=') ? trimmed.slice('sha256='.length) : trimmed;
  return /^[a-f0-9]{64}$/i.test(value) ? value.toLowerCase() : null;
}

export function getWebhookSecretForProvider(provider: string) {
  const envKey = `WEBHOOK_SECRET_${provider.replace(/[^a-z0-9]/gi, '_').toUpperCase()}`;
  const value = process.env[envKey];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function verifyWebhookSignature(secret: string, payload: string, signature: string) {
  const receivedHex = normalizeSignature(signature);
  if (!receivedHex) return false;

  const expectedHex = createHmac('sha256', secret).update(payload).digest('hex');
  const expected = Buffer.from(expectedHex, 'hex');
  const received = Buffer.from(receivedHex, 'hex');

  return expected.length === received.length && timingSafeEqual(expected, received);
}
