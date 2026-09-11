import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const router = fs.readFileSync('src/components/layout/authenticated-shell-router.tsx', 'utf8');
const shell = fs.readFileSync('src/components/layout/mail-product-shell.tsx', 'utf8');
const workspace = fs.readFileSync('src/features/calendar/components/calendar-schedule-workspace.tsx', 'utf8');
const page = fs.readFileSync('src/app/(app)/calendar/page.tsx', 'utf8');
const api = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');
const availabilityApi = fs.readFileSync('src/app/api/calendar/availability/route.ts', 'utf8');

test('Calendar is a real destination in the shared Setu Communications shell', () => {
  assert.match(router, /pathname === '\/calendar'/);
  assert.match(router, /pathname\.startsWith\('\/calendar\/'\)/);
  assert.match(shell, /href="\/calendar"/);
  assert.match(shell, /Setu Calendar/);
  assert.match(shell, /Meetings and schedules/);
  assert.doesNotMatch(shell, /Calendar — coming next/);
});

test('Communications rail marks Mail and Calendar independently and preserves CRM gating', () => {
  assert.match(shell, /active=\{!isCalendar\}/);
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

test('Calendar defaults to a work-week time grid with obvious open time', () => {
  assert.match(workspace, /useState<View>\('week'\)/);
  assert.match(workspace, /function WorkWeekView/);
  assert.match(workspace, /HOUR_HEIGHT/);
  assert.match(workspace, /Create event/);
  assert.match(workspace, />Open</);
  assert.match(workspace, /CurrentTimeLine/);
  assert.match(workspace, /workWeekDays/);
});

test('Working hours and work week are personal, org-scoped and persisted through Calendar availability', () => {
  assert.match(availabilityApi, /calendar_availability/);
  assert.match(availabilityApi, /workspace\.organization/);
  assert.match(availabilityApi, /workspace\.user/);
  assert.match(availabilityApi, /export async function GET/);
  assert.match(availabilityApi, /export async function PUT/);
  assert.match(availabilityApi, /Each work day can only be configured once/);
  assert.match(workspace, /Work week & working hours/);
  assert.match(workspace, /\/api\/calendar\/availability/);
  assert.match(workspace, /DEFAULT_START = '09:00'/);
  assert.match(workspace, /DEFAULT_END = '17:00'/);
});

test('Calendar preserves Month, Week, Day and Agenda views while Week is the primary schedule view', () => {
  assert.match(workspace, /type View = 'month' \| 'week' \| 'day' \| 'agenda'/);
  assert.match(workspace, /function MonthView/);
  assert.match(workspace, /function WorkWeekView/);
  assert.match(workspace, /function DayView/);
  assert.match(workspace, /function AgendaView/);
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
});

test('Desktop Calendar uses the new schedule workspace and mobile remains isolated', () => {
  assert.match(page, /CalendarScheduleWorkspace/);
  assert.match(page, /MobileCalendarWorkspace/);
  assert.match(page, /md:hidden/);
  assert.match(page, /hidden h-full md:block/);
});

test('Event composer follows familiar scheduling hierarchy and prevents end-before-start', () => {
  assert.match(workspace, /Add title/);
  assert.match(workspace, /Invite people/);
  assert.match(workspace, /Location/);
  assert.match(workspace, /Zoom meeting/);
  assert.match(workspace, /Reminder/);
  assert.match(workspace, /End time must be after start time/);
  assert.match(workspace, /Math\.max\(30\*60000/);
  assert.match(workspace, /reminderChannels/);
  assert.match(workspace, /mailThread/);
  assert.match(workspace, /lead/);
  assert.match(workspace, /Join meeting/);
  assert.match(workspace, /\/api\/calendar\/invite/);
});
