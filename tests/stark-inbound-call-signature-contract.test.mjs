import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const inboundPage = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const callInterceptor = fs.readFileSync('src/features/integrations/interakt/components/stark-whatsapp-call-interceptor.tsx', 'utf8');
const authenticatedLayout = fs.readFileSync('src/app/(app)/layout.tsx', 'utf8');
const whatsappActions = fs.readFileSync('src/features/integrations/interakt/sales-message-actions.ts', 'utf8');
const mailSend = fs.readFileSync('src/app/api/mail/send/route.ts', 'utf8');
const signatureHelper = fs.readFileSync('src/lib/messaging/profile-signature.ts', 'utf8');
const createLeadAction = fs.readFileSync('src/features/integrations/interakt/workspace-v2.ts', 'utf8');

test('inbound Create Lead requires an override reason when lead blockers exist', () => {
  assert.match(inboundPage, /leadBlockers\.length\s*\?\s*<select name="overrideReason" required/);
  assert.match(inboundPage, /action=\{createStarkInteraktLeadOverride\}/);
  assert.match(createLeadAction, /const overrideReason = nullable\(formData\.get\('overrideReason'\)\)/);
  assert.match(createLeadAction, /manual_override_reason: overrideReason/);
});

test('Stark Packmate tel links are globally intercepted and routed to WhatsApp', () => {
  assert.match(authenticatedLayout, /StarkWhatsAppCallInterceptor enabled=\{isStarkPackmate\}/);
  assert.match(callInterceptor, /a\[href\^="tel:"\]/);
  assert.match(callInterceptor, /https:\/\/wa\.me\/\$\{digits\}/);
  assert.match(callInterceptor, /event\.preventDefault\(\)/);
});

test('Stark WhatsApp outbound messages always append the profile identity signature', () => {
  assert.match(whatsappActions, /loadRequiredProfileSignature/);
  assert.match(whatsappActions, /appendProfileSignatureText/);
  assert.match(whatsappActions, /profileSignatureText\(senderSignature\)/);
  assert.match(signatureHelper, /Phone: \$\{signature\.phoneNumber\}/);
  assert.match(signatureHelper, /Email: \$\{signature\.emailAddress\}/);
});

test('Setu Mail send route always appends required profile identity even when custom signature is disabled', () => {
  assert.match(mailSend, /loadRequiredProfileSignature/);
  assert.match(mailSend, /const requiredSignatureText = profileSignatureText\(requiredProfileSignature\)/);
  assert.match(mailSend, /const requiredSignatureHtml = profileSignatureHtml\(requiredProfileSignature\)/);
  assert.match(mailSend, /requiredProfileSignature: true/);
});
