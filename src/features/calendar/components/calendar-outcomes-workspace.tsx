'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck2, ExternalLink, Mail, RefreshCw, Sparkles, UsersRound } from 'lucide-react';

type CalendarEvent = { id:string; title:string; starts_at:string; ends_at:string; status:string; meeting_provider:string; meeting_url?:string|null; meeting_metadata?:any; calendar_attendees?:Array<{email:string;name?:string|null;rsvp_status:string}>; calendar_event_links?:Array<{entity_type:string;entity_id:string;label?:string|null}> };
type ContextPayload = { event:CalendarEvent; context:Array<{type:string;id:string;label:string;subtitle?:string|null;href:string}>; outcome?:{notes:string;signals:any[];capturedAt?:string|null}|null; error?:string };
type SuggestedAction = { key:string; label:string; href:string };

function dateLabel(value:string){return new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(new Date(value));}

export function CalendarOutcomesWorkspace(){
  const [events,setEvents]=useState<CalendarEvent[]>([]);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [context,setContext]=useState<ContextPayload|null>(null);
  const [notes,setNotes]=useState('');
  const [actions,setActions]=useState<SuggestedAction[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');

  async function loadEvents(){setLoading(true);setNotice('');const from=new Date(Date.now()-120*86400000).toISOString();const response=await fetch(`/api/calendar?from=${encodeURIComponent(from)}`,{cache:'no-store'});const payload=await response.json();if(!response.ok){setNotice(payload.error||'Unable to load meetings.');setLoading(false);return;}setEvents(payload.events??[]);setLoading(false);}
  async function loadContext(id:string){setSelectedId(id);setContext(null);setActions([]);const response=await fetch(`/api/calendar/event-context/${encodeURIComponent(id)}`,{cache:'no-store'});const payload=await response.json();if(!response.ok){setNotice(payload.error||'Unable to load meeting context.');return;}setContext(payload);setNotes(payload.outcome?.notes??'');}
  useEffect(()=>{void loadEvents();},[]);

  const eligible=useMemo(()=>events.filter(event=>event.status!=='cancelled'&&new Date(event.ends_at).getTime()<=Date.now()).sort((a,b)=>+new Date(b.ends_at)-+new Date(a.ends_at)),[events]);
  const selected=eligible.find(event=>event.id===selectedId)??null;

  async function saveOutcome(){if(!selectedId||!notes.trim()||saving)return;setSaving(true);setNotice('');const response=await fetch('/api/calendar/outcomes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({eventId:selectedId,notes})});const payload=await response.json();setSaving(false);if(!response.ok){setNotice(payload.error||'Unable to save meeting outcome.');return;}setActions(payload.suggestedActions??[]);setNotice(payload.message||'Meeting outcome saved.');await loadEvents();await loadContext(selectedId);}

  return <div className="h-full overflow-hidden bg-[#f7f8fa] text-slate-900">
    <div className="flex h-full min-h-0">
      <aside className="w-[330px] shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Setu Calendar</div><h1 className="mt-1 text-lg font-black">Meeting outcomes</h1></div><button onClick={()=>void loadEvents()} aria-label="Refresh meetings" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><RefreshCw size={16}/></button></div><p className="mt-2 text-xs leading-5 text-slate-500">Capture what happened, then choose the next action. Setu never changes CRM automatically.</p></div>
        {loading?<div className="p-6 text-sm font-semibold text-slate-400">Loading meetings…</div>:eligible.length?eligible.map(event=><button key={event.id} onClick={()=>void loadContext(event.id)} className={`block w-full border-b border-slate-100 p-4 text-left ${selectedId===event.id?'bg-blue-50':'hover:bg-slate-50'}`}><div className="truncate text-sm font-bold text-slate-900">{event.title}</div><div className="mt-1 text-[11px] font-semibold text-slate-500">{dateLabel(event.starts_at)}</div><div className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">{event.status==='completed'?'Outcome captured':'Needs outcome'}</div></button>):<div className="p-6 text-sm leading-6 text-slate-500">No completed meetings are waiting here yet.</div>}
      </aside>

      <main className="min-w-0 flex-1 overflow-y-auto p-5 md:p-8">
        {notice?<div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-800">{notice}</div>:null}
        {!selected?<div className="grid min-h-[60vh] place-items-center"><div className="max-w-sm text-center"><CalendarCheck2 className="mx-auto text-slate-300" size={44}/><h2 className="mt-4 text-xl font-black text-slate-900">Select a completed meeting</h2><p className="mt-2 text-sm leading-6 text-slate-500">Record the outcome and keep follow-up connected to Calendar, Mail and CRM.</p></div></div>:<div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-black text-slate-950">{selected.title}</h2><p className="mt-2 text-sm font-semibold text-slate-500">{dateLabel(selected.starts_at)} – {new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(selected.ends_at))}</p></div>{selected.meeting_url?<a href={selected.meeting_url} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-black text-slate-700">Meeting link <ExternalLink size={13} className="ml-1 inline"/></a>:null}</div>
            <div className="mt-6 grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-black text-slate-700"><UsersRound size={15}/>Attendees</div><div className="mt-3 space-y-2">{(context?.event.calendar_attendees??selected.calendar_attendees??[]).map(attendee=><div key={attendee.email} className="text-xs"><span className="font-bold text-slate-800">{attendee.name||attendee.email}</span><span className="ml-2 text-slate-400">{attendee.rsvp_status.replace('_',' ')}</span></div>)}{!(context?.event.calendar_attendees??selected.calendar_attendees??[]).length?<div className="text-xs text-slate-400">No external attendees.</div>:null}</div></div><div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center gap-2 text-xs font-black text-slate-700"><Sparkles size={15}/>Connected Setu context</div><div className="mt-3 space-y-2">{context?.context?.map(item=><a key={`${item.type}:${item.id}`} href={item.href} className="block rounded-lg bg-white p-2.5 ring-1 ring-slate-200 hover:ring-blue-200"><div className="text-xs font-bold text-slate-800">{item.label}</div>{item.subtitle?<div className="mt-1 text-[10px] text-slate-500">{item.subtitle}</div>:null}</a>)}{!context?.context?.length?<div className="text-xs text-slate-400">No CRM or Mail record is linked to this meeting.</div>:null}</div></div></div>
            <div className="mt-6"><label className="text-xs font-black text-slate-700">Meeting outcome<textarea value={notes} onChange={event=>setNotes(event.target.value)} rows={7} placeholder="What happened? Include decisions, pricing discussion, sample requests, next steps or risks." className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-blue-400"/></label><div className="mt-3 flex justify-end"><button onClick={()=>void saveOutcome()} disabled={!notes.trim()||saving} className="rounded-xl bg-[#0b2e4a] px-5 py-3 text-sm font-black text-white disabled:opacity-40">{saving?'Saving…':'Save outcome'}</button></div></div>
            {actions.length?<div className="mt-6 border-t border-slate-200 pt-5"><div className="text-xs font-black uppercase tracking-[.12em] text-slate-400">Suggested next actions</div><div className="mt-3 flex flex-wrap gap-2">{actions.map(action=><a key={action.key} href={action.href} className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-black text-blue-800">{action.label}</a>)}</div><p className="mt-3 text-[11px] font-semibold text-slate-500">Suggestions are review-only. Nothing is sent or changed in CRM until you choose an action.</p></div>:null}
          </div>
        </div>}
      </main>
    </div>
  </div>;
}
