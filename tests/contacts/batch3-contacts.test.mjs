import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read=(path)=>readFileSync(path,'utf8');
test('Contacts are a dedicated org-scoped model and never auto-create Leads',()=>{const migration=read('supabase/migrations/20260912015600_s41_batch3_contacts_crm_identity.sql');const api=read('src/app/api/contacts/route.ts');assert.match(migration,/create table if not exists public\.contacts/);assert.match(migration,/alter table public\.contacts enable row level security/);assert.match(migration,/contacts_org_normalized_email_uniq/);assert.match(migration,/grant select, insert, update on public\.contacts to authenticated/);assert.doesNotMatch(migration,/insert into public\.leads/i);assert.match(api,/leadCreated: false/);});
test('Contacts UX supports list search add edit archive CRM linking Mail and Calendar',()=>{const ui=read('src/features/contacts/components/contacts-workspace.tsx');for(const token of ['New contact','Search contacts','Edit','Archive','CRM relationships','Link ','/mail?compose=1','/calendar?compose=1'])assert.match(ui,new RegExp(token.replace(/[?]/g,'\\?')));});
