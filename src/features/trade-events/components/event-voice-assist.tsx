'use client';

import { useMemo, useRef, useState } from 'react';
import { Mic2, Sparkles, Square } from 'lucide-react';
import { extractEventVoiceSuggestions } from '@/lib/trade-events/voice-extract';

function apply(form: HTMLFormElement, name: string, value: string | boolean | undefined) {
  if (value === undefined) return;
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement) {
    if (field.type === 'checkbox') field.checked = Boolean(value);
    else if (!field.value.trim()) field.value = String(value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  } else if (field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    if (!field.value.trim() || field.value === 'unknown') field.value = String(value);
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

export function EventVoiceAssist() {
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognition = useRef<any>(null);
  const suggestion = useMemo(() => extractEventVoiceSuggestions(transcript), [transcript]);
  const hasSuggestion = Object.values(suggestion).some(Boolean);

  function toggleVoice() {
    if (listening) { recognition.current?.stop?.(); setListening(false); return; }
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) { setMessage('Use your keyboard microphone or type/paste the note in this browser.'); return; }
    const instance = new Recognition();
    instance.lang = navigator.language || 'en-US'; instance.continuous = true; instance.interimResults = true;
    instance.onresult = (event: any) => { let text = ''; for (let i = 0; i < event.results.length; i += 1) text += `${event.results[i][0]?.transcript ?? ''} `; setTranscript(text.trim()); };
    instance.onend = () => setListening(false);
    instance.onerror = () => { setListening(false); setMessage('Voice capture stopped. Review the transcript before saving.'); };
    recognition.current = instance; instance.start(); setListening(true); setMessage('');
  }

  function confirm(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.closest('form'); if (!form) return;
    apply(form, 'product_interest', suggestion.productInterest);
    apply(form, 'approximate_quantity', suggestion.quantity);
    apply(form, 'packaging_product_type', suggestion.productType);
    apply(form, 'packaging_application', suggestion.application);
    apply(form, 'artwork_status', suggestion.artworkStatus);
    apply(form, 'sample_needed', suggestion.sampleNeeded);
    const notes = form.elements.namedItem('notes');
    if (notes instanceof HTMLTextAreaElement && !notes.value.trim()) { notes.value = transcript; notes.dispatchEvent(new Event('input', { bubbles: true })); }
    setMessage('Suggestions applied. Review the fields before saving.');
  }

  return <section className="rounded-2xl border border-violet-200 bg-violet-50/50 p-4">
    <input type="hidden" name="voice_transcript" value={transcript} />
    <div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-1 text-xs font-black uppercase tracking-[0.14em] text-violet-700"><Sparkles className="h-4 w-4" />Setu Guru capture assist</p><p className="mt-1 text-xs font-semibold text-slate-600">Guru proposes fields. Nothing is applied until you confirm.</p></div><button type="button" onClick={toggleVoice} className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white">{listening ? <Square className="mr-1 h-4 w-4" /> : <Mic2 className="mr-1 h-4 w-4" />}{listening ? 'Stop' : 'Speak'}</button></div>
    <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm" placeholder="Looking for printed stand-up pouch for masala, 50,000 per month, artwork ready, wants a sample." />
    {hasSuggestion ? <button type="button" onClick={confirm} className="mt-3 min-h-10 rounded-xl bg-violet-700 px-4 text-xs font-black text-white">Apply suggested fields</button> : null}
    {message ? <p className="mt-2 text-xs font-semibold text-violet-800">{message}</p> : null}
  </section>;
}
