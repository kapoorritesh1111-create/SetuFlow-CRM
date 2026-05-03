import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobileNav = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
const standaloneHome = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
const leadDrawer = readFileSync('src/features/leads/components/lead-drawer.tsx', 'utf8');

test('mobile home is operational and not marketing-copy heavy', () => {
  assert.match(mobileNav, /Trade work/);
  assert.match(mobileNav, /Actions/);
  assert.doesNotMatch(mobileNav, /Capture faster|Quote smarter|Close from the floor|Your fastest path|Review status, owner, team|Start a fast buyer/);
  assert.doesNotMatch(standaloneHome, /Review status, owner, team|Start a buyer quote|Add buyer or supplier from the field|See save, sync/);
});

test('quick lead supports product, category, and new request interests', () => {
  assert.match(leadDrawer, /QuickInterestMode\s*=\s*[\"']product[\"']\s*\|\s*[\"']category[\"']\s*\|\s*[\"']new_request[\"']/);
  assert.match(leadDrawer, /New supply/);
  assert.match(leadDrawer, /New buyer request/);
  assert.match(leadDrawer, /Select category/);
  assert.match(leadDrawer, /quickInterestNote/);
  assert.match(leadDrawer, /mergeLeadNotesWithInterest/);
});

test('quick lead includes voice note entry without a new paid service', () => {
  assert.match(leadDrawer, /SpeechRecognition/);
  assert.match(leadDrawer, /webkitSpeechRecognition/);
  assert.match(leadDrawer, /handleDictateNote/);
  assert.match(leadDrawer, /🎙 Dictate/);
  assert.match(leadDrawer, /Trade note/);
});
