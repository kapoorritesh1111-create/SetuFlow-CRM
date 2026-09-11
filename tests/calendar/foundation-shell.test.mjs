import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const router = fs.readFileSync('src/components/layout/authenticated-shell-router.tsx', 'utf8');
const shell = fs.readFileSync('src/components/layout/mail-product-shell.tsx', 'utf8');
const workspace = fs.readFileSync('src/features/calendar/components/calendar-workspace.tsx', 'utf8');
const page = fs.readFileSync('src/app/(app)/calendar/page.tsx', 'utf8');
const api = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');

test('Calendar is a real destination in the shared Setu Communications shell', () => {
  assert.match(router, /pathname === '\/calendar'/);
  assert.match(router, /pathname\.startsWith\('\/calendar\/'\)/);
  assert.match(shell, /href="\/calendar"/);
  assert.match(shell, /Setu Calendar/);
  assert.match(shell, /Meetings and schedules/);
  assert.doesNotMatch(shell, /Calendar — coming next/);
  assert.doesNotMatch(shell, /<button[^>]*disabled[^>]*>\s*<CalendarDays/);
});

test('Communications rail marks Mail and Calendar independently and preserves CRM gating', () => {
  assert.match(shell, /active=!isCalendar/);
  assert.match(shell, /active=\{isCalendar\}/);
  assert.match(shell, /access\.crmEnabled/);
  assert.match(shell, /CrmProductIcon/);
});

test('Calendar top search is bridged into calendar content rather than Mail search', () => {
  assert.match(shell, /setu-calendar-search/);
  assert.match(shell, /Search Setu Calendar/);
  assert.match(workspace, /addEventListener\('setu-calendar-search'/);
  assert.match(workspace, /matchesSearch/);
  assert.match(workspace, /calendar_attendees/);
});

test('Calendar exposes truthful Month, Week, Day and Agenda renderers', () => {
  assert.match(workspace, /type View = 'month' \| 'week' \| 'day' \| 'agenda'/);
  assert.match(workspace, /function MonthView/);
  assert.match(workspace, /function WeekView/);
  assert.match(workspace, /function DayView/);
  assert.match(workspace, /function AgendaView/);
  assert.match(workspace, /Array\.from\(\{ length: 7 \}/);
  assert.match(workspace, /grid-cols-7/);
  assert.doesNotMatch(workspace, /view==='agenda'\|\|sameDay/);
});

test('Calendar keeps existing create/edit/delete, attendees, reminders and CRM-link contracts', () => {
  assert.match(api, /export async function GET/);
  assert.match(api, /export async function POST/);
  assert.match(api, /export async function PATCH/);
  assert.match(api, /export async function DELETE/);
  assert.match(api, /calendar_attendees/);
  assert.match(api, /calendar_reminders/);
  assert.match(api, /calendar_event_links/);
  assert.match(api, /This time overlaps another calendar event/);
  assert.match(api, /\.eq\('organization_id',organizationId\)/);
});

test('Calendar page preserves separate desktop and mobile workspaces', () => {
  assert.match(page, /CalendarWorkspace/);
  assert.match(page, /MobileCalendarWorkspace/);
  assert.match(page, /md:hidden/);
  assert.match(page, /hidden md:block/);
});

test('Calendar event drawer preserves guest, meeting, reminder and context actions', () => {
  assert.match(workspace, /Zoom — recommended/);
  assert.match(workspace, /Custom meeting link/);
  assert.match(workspace, /In person/);
  assert.match(workspace, /reminderChannels/);
  assert.match(workspace, /mailThread/);
  assert.match(workspace, /lead/);
  assert.match(workspace, /Join meeting/);
  assert.match(workspace, /\/api\/calendar\/invite/);
});
