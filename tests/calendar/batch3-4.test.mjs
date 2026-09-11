import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const availability = fs.readFileSync('src/lib/calendar/booking-availability.ts', 'utf8');
const bookingApi = fs.readFileSync('src/app/api/calendar/booking/route.ts', 'utf8');
const bookingPageApi = fs.readFileSync('src/app/api/calendar/booking-page/route.ts', 'utf8');
const bookingPage = fs.readFileSync('src/app/book/[slug]/page.tsx', 'utf8');
const bookingSettings = fs.readFileSync('src/features/calendar/components/calendar-booking-settings.tsx', 'utf8');
const bookingMigration = fs.readFileSync('supabase/migrations/20260911201500_calendar_booking_atomic_slots.sql', 'utf8');
const outcomes = fs.readFileSync('src/app/api/calendar/outcomes/route.ts', 'utf8');
const outcomeWorkspace = fs.readFileSync('src/features/calendar/components/calendar-outcomes-workspace.tsx', 'utf8');
const eventContext = fs.readFileSync('src/app/api/calendar/event-context/[id]/route.ts', 'utf8');
const mailIntelligence = fs.readFileSync('src/app/api/mail/intelligence/[id]/route.ts', 'utf8');
const invitationDelivery = fs.readFileSync('src/lib/calendar/invite-delivery.ts', 'utf8');
const shell = fs.readFileSync('src/components/layout/mail-product-shell.tsx', 'utf8');

test('Batch 4 calculates public booking slots on the server in the organizer timezone', () => {
  assert.match(availability, /Intl\.DateTimeFormat\('en-CA'/);
  assert.match(availability, /zonedDateTimeToUtc/);
  assert.match(availability, /minimumNoticeMinutes/);
  assert.match(availability, /bookingWindowDays/);
  assert.match(availability, /busy\.status === 'cancelled'/);
  assert.match(availability, /busy\.show_as === 'free'/);
  assert.match(availability, /bufferMs/);
  assert.match(bookingApi, /buildBookingSlots/);
  assert.match(bookingApi, /requestedSlotIsValid/);
  assert.match(bookingApi, /slots: snapshot\.slots/);
  assert.doesNotMatch(bookingApi, /busy:\s*events/);
});

test('Public booking is atomically reserved so concurrent visitors cannot double book', () => {
  assert.match(bookingApi, /calendar_book_slot_if_available/);
  assert.match(bookingMigration, /pg_advisory_xact_lock/);
  assert.match(bookingMigration, /status <> 'cancelled'/);
  assert.match(bookingMigration, /show_as, 'busy'\) <> 'free'/);
  assert.match(bookingMigration, /grant execute .* service_role/i);
  assert.match(bookingMigration, /revoke all .* anon, authenticated/i);
});

test('Public booking UI consumes server slots and shows timezone conversion honestly', () => {
  assert.match(bookingPage, /data\?\.slots/);
  assert.match(bookingPage, /visitorTimeZone/);
  assert.match(bookingPage, /Organizer working hours are maintained in/);
  assert.match(bookingPage, /response\.status === 409/);
  assert.doesNotMatch(bookingPage, /data\.busy/);
  assert.doesNotMatch(bookingPage, /data\.availability/);
});

test('Owners can manage booking duration, buffers, notice, window and provider', () => {
  assert.match(bookingPageApi, /calendar_booking_pages/);
  assert.match(bookingPageApi, /duration_minutes/);
  assert.match(bookingPageApi, /buffer_minutes/);
  assert.match(bookingPageApi, /minimum_notice_minutes/);
  assert.match(bookingPageApi, /booking_window_days/);
  assert.match(bookingPageApi, /meeting_provider/);
  assert.match(bookingSettings, /Save booking page/);
  assert.match(bookingSettings, /Buffer between meetings/);
  assert.match(bookingSettings, /Minimum notice/);
  assert.match(shell, /\/calendar\/booking/);
});

test('Batch 3 Mail to Meeting remains one click and carries recipient, lead and Mail thread context', () => {
  assert.match(mailIntelligence, /key:'schedule_meeting'/);
  assert.match(mailIntelligence, /actionLabel:'Schedule meeting'/);
  assert.match(mailIntelligence, /\/calendar\?compose=1/);
  assert.match(mailIntelligence, /guest=/);
  assert.match(mailIntelligence, /lead=/);
  assert.match(mailIntelligence, /mailThread=/);
  assert.match(mailIntelligence, /autonomousActions:false/);
});

test('Meeting outcomes preserve provider metadata and keep follow-up human controlled', () => {
  assert.match(outcomes, /\.\.\.existingMetadata/);
  assert.match(outcomes, /outcome_notes/);
  assert.match(outcomes, /outcome_signals/);
  assert.match(outcomes, /Only the meeting organizer can capture the outcome/);
  assert.match(outcomes, /autonomousActions: false/);
  assert.match(outcomeWorkspace, /Suggested next actions/);
  assert.match(outcomeWorkspace, /Nothing is sent or changed in CRM until you choose an action/);
  assert.match(shell, /\/calendar\/outcomes/);
});

test('Calendar event context is organization scoped and enriches CRM, quote, order and Mail links', () => {
  assert.match(eventContext, /\.eq\('organization_id', organizationId\)/);
  assert.match(eventContext, /from\('leads'\)/);
  assert.match(eventContext, /from\('quotes'\)/);
  assert.match(eventContext, /from\('orders'\)/);
  assert.match(eventContext, /from\('mail_threads'\)/);
  assert.match(eventContext, /autonomousActions: false/);
});

test('Calendar invitation sends are metered as Resend provider usage and respect the organization allowance', () => {
  assert.match(invitationDelivery, /mail_usage_monthly_rollups/);
  assert.match(invitationDelivery, /monthly_message_limit/);
  assert.match(invitationDelivery, /mail_usage_events/);
  assert.match(invitationDelivery, /calendar_invite:/);
  assert.match(invitationDelivery, /source:'calendar_invitation'/);
  assert.match(invitationDelivery, /monthly Setu Communications email allowance/);
});
