import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const route = fs.readFileSync('src/app/api/mail/intelligence/[id]/route.ts', 'utf8');
const desktop = fs.readFileSync('src/features/mail/components/setu-mail-workspace.tsx', 'utf8');
const mobile = fs.readFileSync('src/features/mail/components/mobile-setu-mail-workspace.tsx', 'utf8');

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

test('Desktop and mobile Mail Reader already surface Guru evidence and user-controlled action links', () => {
  for (const source of [desktop, mobile]) {
    assert.match(source, /Setu Guru/);
    assert.match(source, /intent\.suggestedAction/);
    assert.match(source, /intent\.evidence/);
    assert.match(source, /intent\.actionHref/);
    assert.match(source, /intent\.actionLabel/);
  }
});
