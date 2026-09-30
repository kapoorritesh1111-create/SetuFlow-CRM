import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
const card=fs.readFileSync('src/features/integrations/interakt/components/inbound-follow-up-card.tsx','utf8');
const meeting=fs.readFileSync('src/features/sales-meetings/StarkMeetingPanel.tsx','utf8');
const inbound=fs.readFileSync('src/app/(app)/leads/inbound/page.tsx','utf8');
test('follow-up modal escapes page stacking contexts',()=>{assert.match(card,/createPortal/);assert.match(card,/z-\[9999\]/);assert.match(card,/document\.body/);assert.match(card,/Escape/);});
test('meeting email is optional and WhatsApp sharing is supported',()=>{assert.match(meeting,/Customer invite is optional/);assert.match(meeting,/Share meeting via WhatsApp/);assert.match(meeting,/wa\.me/);assert.match(inbound,/customerPhone=\{selected\.full_phone_number\}/);});
