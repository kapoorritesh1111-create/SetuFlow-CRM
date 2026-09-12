import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const exports = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/features/calendar/components/calendar-attendee-list.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, { exports, require });
const render = attendees => renderToStaticMarkup(React.createElement(exports.CalendarAttendeeList, { attendees }));

test('mobile event details render saved guests without organizer metadata', () => {
  const html = render([
    { email: 'guest@example.com', name: 'Guest One', rsvp_status: 'accepted' },
    { email: 'optional@example.com', attendee_type: 'optional', rsvp_status: 'pending' },
  ]);
  for (const label of ['Invited people (2)', 'Guest One', 'guest@example.com', 'Accepted', 'Optional', 'Awaiting response']) assert.ok(html.includes(label));
  const mobile = readFileSync('src/features/calendar/components/mobile-calendar-workspace.tsx', 'utf8');
  assert.ok(mobile.includes('<CalendarAttendeeList attendees={event.calendar_attendees ?? []}/>'));
});

test('attendees show tentative and declined responses and escape guest content', () => {
  const html = render([
    { email: 'one@example.com', name: '<script>alert(1)</script>', rsvp_status: 'tentative' },
    { email: 'two@example.com', rsvp_status: 'declined' },
  ]);
  assert.ok(html.includes('Tentative'));
  assert.ok(html.includes('Declined'));
  assert.ok(!html.includes('<script>'));
  assert.equal(render([]), '');
});
