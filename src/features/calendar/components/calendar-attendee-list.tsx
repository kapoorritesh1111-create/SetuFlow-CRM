type Attendee = {
  email: string;
  name?: string | null;
  attendee_type?: 'required' | 'optional';
  rsvp_status: string;
};

const responseLabels: Record<string, string> = {
  accepted: 'Accepted',
  tentative: 'Tentative',
  declined: 'Declined',
};

export function CalendarAttendeeList({ attendees }: { attendees: Attendee[] }) {
  if (!attendees.length) return null;
  return <section aria-label="Invited people" className="rounded-card bg-surface-2 p-4">
    <h3 className="font-semibold">Invited people ({attendees.length})</h3>
    <ul className="mt-3 divide-y divide-line">
      {attendees.map(attendee => <li key={attendee.email} className="py-3 first:pt-0 last:pb-0">
        <div className="break-words font-medium">{attendee.name || attendee.email}</div>
        {attendee.name ? <div className="break-words text-sm text-content-secondary">{attendee.email}</div> : null}
        <div className="mt-1 text-xs text-content-muted">
          {attendee.attendee_type === 'optional' ? 'Optional' : 'Required'} · {responseLabels[attendee.rsvp_status] || 'Awaiting response'}
        </div>
      </li>)}
    </ul>
  </section>;
}
