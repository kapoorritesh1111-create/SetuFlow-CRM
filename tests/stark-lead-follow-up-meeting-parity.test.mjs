import fs from 'node:fs';import test from 'node:test';import assert from 'node:assert/strict';
const composer=fs.readFileSync('src/features/leads/canonical/StarkFollowUpComposer.tsx','utf8');
const detail=fs.readFileSync('src/features/leads/canonical/StarkLeadDetailApproved.tsx','utf8');
test('CRM lead follow-up uses modal and includes meeting type',()=>{assert.match(composer,/createPortal/);assert.match(composer,/📅 Meeting/);assert.match(composer,/StarkMeetingPanel/);assert.match(composer,/z-\[9999\]/);assert.doesNotMatch(composer,/<select/);});
test('CRM lead passes customer contact details to meeting flow',()=>{assert.match(detail,/customerEmail=\{lead\.email\}/);assert.match(detail,/customerPhone=\{phone\}/);});
