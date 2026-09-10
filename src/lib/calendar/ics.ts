type IcsEvent={uid:string;title:string;description?:string|null;location?:string|null;startsAt:string;endsAt:string;organizerEmail:string;organizerName:string;attendees:string[];meetingUrl?:string|null};
const esc=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
const utc=(s:string)=>new Date(s).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
export function buildIcs(e:IcsEvent,method:'REQUEST'|'CANCEL'='REQUEST'){
 const desc=[e.description,e.meetingUrl?`Join meeting: ${e.meetingUrl}`:null].filter(Boolean).join('\n\n');
 return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Setu Flow//Setu Communications//EN','CALSCALE:GREGORIAN',`METHOD:${method}`,'BEGIN:VEVENT',`UID:${e.uid}@setuflowcrm.com`,`DTSTAMP:${utc(new Date().toISOString())}`,`DTSTART:${utc(e.startsAt)}`,`DTEND:${utc(e.endsAt)}`,`SUMMARY:${esc(e.title)}`,`DESCRIPTION:${esc(desc)}`,e.location?`LOCATION:${esc(e.location)}`:'',`ORGANIZER;CN=${esc(e.organizerName)}:mailto:${e.organizerEmail}`,...e.attendees.map(a=>`ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:${a}`),'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'].filter(Boolean).join('\r\n');
}
