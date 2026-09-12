import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const route = fs.readFileSync('src/app/api/mail/intelligence/[id]/route.ts', 'utf8');
const desktop = fs.readFileSync('src/features/mail/components/setu-mail-workspace.tsx', 'utf8');
const mobile = fs.readFileSync('src/features/mail/components/mobile-setu-mail-workspace.tsx', 'utf8');
const detail = fs.readFileSync('src/features/mail/components/mail-intelligence-detail.tsx', 'utf8');
const contextPage = fs.readFileSync('src/app/(app)/mail/crm-context/[id]/page.tsx', 'utf8');

test('S41-MAIL-009 grounds Reader intelligence in message attachments and live CRM context', () => {
  assert.match(route, /from\('mail_attachments'\)/);
  assert.match(route, /from\('quotes'\)/);
  assert.match(route, /from\('orders'\)/);
  assert.match(route, /from\('lead_follow_ups'\)/);
  assert.match(route, /evidenceSources/);
  assert.match(route, /source: 'attachment'/);
  assert.match(route, /source: 'crm'/);
  assert.match(route, /intelligenceVersion: 's41-mail-009'/);
});

test('S41-MAIL-009 recognizes RFQ and PO from message or attachment evidence', () => {
  assert.match(route, /key: 'rfq'/);
  assert.match(route, /attachmentPattern: \/\(\?:\^\|\[\\s_\.-\]\)\(rfq/);
  assert.match(route, /key: 'purchase_order'/);
  assert.match(route, /purchase\[\\s_\.-\]\*order/);
  assert.match(route, /Review quote before handoff/);
  assert.match(route, /Review order/);
});

test('S41-MAIL-009 uses current CRM quote state to recognize short inbound acceptance replies', () => {
  assert.match(route, /direction === 'inbound'/);
  assert.match(route, /quoteSupportsAcceptance/);
  assert.match(route, /COMMERCIAL_QUOTE/);
  assert.match(route, /ACCEPTANCE_PATTERN/);
  assert.match(route, /Review quote acceptance/);
  assert.match(route, /before accepting terms or allowing order handoff/);
});

test('S41-MAIL-009 routes shipment risk and follow-up signals to review-only CRM actions', () => {
  assert.match(route, /key: 'shipment_risk'/);
  assert.match(route, /port congestion|customs hold|container unavailable|vessel delay/);
  assert.match(route, /Review order risk/);
  assert.match(route, /key: 'follow_up'/);
  assert.match(route, /handoff=follow-up/);
  assert.match(route, /requiresReview: true/);
  assert.match(route, /autonomousActions: false/);
});

test('S41-MAIL-009 honors explicit Mail thread CRM links when sender email alone does not match', () => {
  assert.match(route, /mail_crm_links/);
  assert.match(route, /\['lead', 'buyer', 'supplier'\]/);
  assert.match(route, /explicitLeadShape/);
  assert.match(route, /createCrmHref: lead \? null : createLeadHref/);
});

test('Desktop Reader surfaces Guru evidence and exact user-controlled review actions', () => {
  assert.match(desktop, /Setu Guru/);
  assert.match(desktop, /intent\.suggestedAction/);
  assert.match(desktop, /intent\.evidence/);
  assert.match(desktop, /intent\.actionHref/);
  assert.match(desktop, /intent\.actionLabel/);
});

test('Mobile Reader keeps the recommendation visible and hands off to a full evidence/action surface', () => {
  assert.match(mobile, /Setu Guru/);
  assert.match(mobile, /intent\.suggestedAction/);
  assert.match(mobile, /intelligence\.crmMatch\.href/);
  assert.match(mobile, /intelligence\.createCrmHref/);
  assert.match(contextPage, /MailIntelligenceDetail messageId=\{message\.id\}/);
  assert.match(detail, /intent\.evidence/);
  assert.match(detail, /intent\.actionHref/);
  assert.match(detail, /intent\.actionLabel/);
  assert.match(detail, /Autonomous CRM actions: off/);
});
