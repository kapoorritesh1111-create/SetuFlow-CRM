
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const route=fs.readFileSync('src/app/api/stark/meetings/route.ts','utf8'),panel=fs.readFileSync('src/features/sales-meetings/StarkMeetingPanel.tsx','utf8'),dashboard=fs.readFileSync('src/app/(app)/leads/meetings/page.tsx','utf8'),migration=fs.readFileSync('supabase/migrations/20260930070100_stark_sales_meetings_pipeline.sql','utf8');
test('Stark meetings are activities with reminders, invitations and Surbhi visibility',()=>{assert.match(route,/calendar_events/);assert.match(route,/minutes_before:15/);assert.match(route,/deliverCalendarInvitations/);assert.match(route,/SURBHI_EMAIL/);assert.match(route,/meeting_scheduled/);assert.match(route,/meeting_completed/);assert.match(panel,/Schedule meeting/);assert.match(panel,/Visit customer/);assert.match(panel,/Customer visits office/);assert.match(panel,/Team meetings/);});
test('manager KPI and pipeline correction are present',()=>{assert.match(dashboard,/Team KPI/);assert.match(dashboard,/Awaiting outcome/);assert.match(migration,/Sample Sent/);assert.match(migration,/Artwork Reviewed/);assert.doesNotMatch(migration,/then 'Meeting Scheduled'/);});
