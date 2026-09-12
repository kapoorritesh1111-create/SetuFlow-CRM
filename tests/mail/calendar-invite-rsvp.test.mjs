import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const ts=require('typescript');
const read=path=>readFileSync(path,'utf8');
function load(){const exports={};const source=ts.transpileModule(read('src/lib/calendar/incoming-mail-invite.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(source,{exports,require:name=>{if(name==='@/lib/calendar/recurrence')return{isValidTimeZone:()=>true,localDateTimeToUtc:(value)=>new Date(`${value}Z`)};throw new Error(`Unexpected ${name}`);},URL,Date,Intl});return exports;}
const mod=load();
const apple=`BEGIN:VCALENDAR\r\nVERSION:2.0\r\nMETHOD:REQUEST\r\nBEGIN:VEVENT\r\nUID:apple-test-123\r\nSEQUENCE:2\r\nDTSTART;TZID=America/New_York:20260912T140000\r\nDTEND;TZID=America/New_York:20260912T150000\r\nSUMMARY:Calendar notifications\r\nLOCATION:New York\r\nORGANIZER;CN=Ritesh Kapoor:mailto:organizer@example.com\r\nATTENDEE;CN=Recipient;ROLE=REQ-PARTICIPANT;RSVP=TRUE;PARTSTAT=NEEDS-ACTION:mailto:user@example.com\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n`;

test('incoming REQUEST resolves organizer attendee sequence and timezone',()=>{const invite=mod.parseIncomingMailInvite(apple);assert.equal(invite.method,'REQUEST');assert.equal(invite.uid,'apple-test-123');assert.equal(invite.sequence,2);assert.equal(invite.organizer.email,'organizer@example.com');assert.equal(invite.organizer.name,'Ritesh Kapoor');assert.equal(invite.attendees[0].email,'user@example.com');assert.equal(invite.timezone,'America/New_York');});

test('reply is a standards-style METHOD:REPLY to original UID and organizer',()=>{const invite=mod.parseIncomingMailInvite(apple);const reply=mod.buildIncomingInviteReply(invite,{email:'user@example.com',name:'Recipient'},'accepted');assert.match(reply,/METHOD:REPLY/);assert.match(reply,/UID:apple-test-123/);assert.match(reply,/PARTSTAT=ACCEPTED/);assert.match(reply,/ORGANIZER;CN="Ritesh Kapoor":mailto:organizer@example\.com/);assert.doesNotMatch(reply,/@setuflowcrm\.com/);});

test('reader card provides first-class Accept Tentative Decline controls and no external-script dependency',()=>{const invite=mod.parseIncomingMailInvite(apple);const card=mod.incomingInviteCardHtml({invite,messageId:'11111111-1111-4111-8111-111111111111',attachmentId:'22222222-2222-4222-8222-222222222222',mailboxId:'33333333-3333-4333-8333-333333333333',mailboxAddress:'user@example.com'});assert.match(card,/Setu Calendar invitation/);assert.match(card,/value="accepted"/);assert.match(card,/value="tentative"/);assert.match(card,/value="declined"/);assert.match(card,/min-height:44px/);assert.doesNotMatch(card,/<script/i);});

test('mail detail promotes actionable ICS into invitation card instead of generic attachment',()=>{const route=read('src/app/api/mail/messages/[id]/route.ts');assert.match(route,/incomingInviteCardHtml/);assert.match(route,/visibleAttachments=calendarInvite\?allAttachments\.filter/);assert.match(route,/Original invitation message/);});

test('calendar invite response persists accepted tentative or declined and sends REPLY',()=>{const route=read('src/app/api/mail/calendar-invite/route.ts');assert.match(route,/buildIncomingInviteReply/);assert.match(route,/RESPONSES/);assert.match(route,/source_ics_response/);assert.match(route,/show_as:requestedResponse==='tentative'\?'tentative':'busy'/);assert.match(route,/status:requestedResponse==='tentative'\?'tentative':'confirmed'/);assert.match(route,/status:'cancelled'/);assert.match(route,/text\/calendar; method=REPLY/);assert.match(route,/NextResponse\.redirect/);});

test('calendar RSVP reuses the previously imported event before inserting a duplicate',()=>{const route=read('src/app/api/mail/calendar-invite/route.ts');assert.match(route,/meeting_metadata->>source_ics_uid/);assert.match(route,/meeting_metadata->>source_message_id/);assert.match(route,/let existing:any=byUid\.data/);assert.match(route,/if \(!existing\)/);assert.match(route,/This invitation overlaps another event on your Setu Calendar/);});

test('outbound Setu Calendar remains a real REQUEST or CANCEL invitation',()=>{const delivery=read('src/lib/calendar/invite-delivery.ts');assert.match(delivery,/buildIcs/);assert.match(delivery,/text\/calendar; method=\$\{method\}/);assert.match(delivery,/METHOD|REQUEST/);const ics=read('src/lib/calendar/ics.ts');assert.match(ics,/METHOD:\$\{method\}/);assert.match(ics,/ATTENDEE/);assert.match(ics,/ORGANIZER/);});
