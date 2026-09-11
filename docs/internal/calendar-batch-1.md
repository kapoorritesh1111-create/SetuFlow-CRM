# Calendar Batch 1 — Foundation + Work Week UX

Status: Preview review required before production merge.

## Product direction
- Keep the Setu Communications foundation shell approved during preview review.
- Use familiar mainstream calendar interaction patterns without copying Microsoft or Google branding.
- Default desktop Calendar to Work Week.
- Let each user configure work days and working hours.
- Use a vertical time grid so busy and open time are visible at a glance.
- Clicking an open slot starts a new event at that exact time.
- Preserve Month, Day and Agenda views.
- Keep mobile isolated until the desktop flow is approved.

## Event composer
- Familiar scheduling hierarchy: title, date/time, people, location, meeting, reminder and notes.
- Preserve Zoom, custom link, in-person and no-online-meeting options.
- Preserve reminders, email invitation flow and CRM context links.
- End time must remain after start time; moving start keeps at least a 30-minute duration.

## Working hours
- Backed by the existing calendar_availability table.
- Personal and organization scoped.
- Default presentation when no saved availability exists: Monday-Friday, 09:00-17:00 in the browser time zone.
- Settings allow selecting work days and per-day start/end hours.

## Release gate
- Mail regression suite remains required.
- Calendar regression suite is now required by the Vercel production build.
- No production merge until preview UX is approved.
