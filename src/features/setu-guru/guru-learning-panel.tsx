'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Lesson = { id: string; question: string; answer: string; category: string; status: 'pending' | 'approved' | 'rejected'; reviewedAt: string | null };

export function SetuGuruLearningPanel({ initialQuestion, onClose }: { initialQuestion?: string; onClose: () => void }) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [question, setQuestion] = useState(initialQuestion ?? '');
  const [answer, setAnswer] = useState('');
  const [category, setCategory] = useState('Sales & customer service');
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, string>>({});

  const reload = useCallback(async () => {
    const response = await fetch('/api/setu-guru/knowledge', { cache: 'no-store' });
    const data = await response.json() as { lessons?: Lesson[]; canManage?: boolean; error?: string };
    if (!response.ok) throw new Error(data.error || 'Could not load Guru knowledge.');
    setLessons(data.lessons ?? []);
    setCanManage(Boolean(data.canManage));
  }, []);

  useEffect(() => {
    let active = true;
    void reload().catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Knowledge unavailable.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim() || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/setu-guru/knowledge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), answer: canManage ? answer.trim() || undefined : undefined, category }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save.');
      setNotice(canManage ? 'Submitted for review. Knowledge is not active until approved.' : 'Question sent to the review queue.');
      setAnswer(''); setQuestion('');
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to submit.'); }
    finally { setBusy(false); }
  }

  async function review(item: Lesson, decision: 'approved' | 'rejected') {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch('/api/setu-guru/knowledge', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id, decision, answer: reviewAnswers[item.id] ?? item.answer }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Review failed.');
      setNotice(decision === 'approved' ? 'Approved lesson can now answer future questions.' : 'Item rejected.');
      await reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Review failed.'); }
    finally { setBusy(false); }
  }

  const pending = lessons.filter((lesson) => lesson.status === 'pending');
  const approved = lessons.filter((lesson) => lesson.status === 'approved');

  return (
    <section className="mt-3 rounded-2xl border border-sky-200 bg-white p-3 shadow-sm" aria-label="SETU Guru knowledge">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div><h3 className="text-sm font-bold text-slate-900">Guru Knowledge</h3><p className="text-xs text-slate-500">One Guru. Organization-approved guidance for every permitted role.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg border px-2 py-1 text-xs text-slate-600">Close</button>
      </div>
      {loading && <p className="text-xs text-slate-500">Loading knowledge…</p>}
      {error && <p role="alert" className="mb-2 text-xs text-rose-700">{error}</p>}
      {notice && <p role="status" className="mb-2 text-xs text-emerald-700">{notice}</p>}
      <form onSubmit={submit} className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">Question or missing company procedure
          <textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} maxLength={1200} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="What should Guru know?" required />
        </label>
        {canManage && <>
          <label className="block text-xs font-semibold text-slate-700">Suggested answer (optional for questions)
            <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={3} maxLength={6000} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" placeholder="Teach Guru the correct company procedure…" />
          </label>
          <label className="block text-xs font-semibold text-slate-700">Category
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm">
              {['Sales & customer service', 'Pricing & quotations', 'Follow-ups', 'Production & delivery', 'General'].map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
        </>}
        <button type="submit" disabled={busy || question.trim().length < 5} className="rounded-lg bg-sky-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{canManage ? 'Submit for approval' : 'Request an answer'}</button>
      </form>
      {canManage && pending.length > 0 && <div className="mt-4 border-t pt-3">
        <h4 className="text-xs font-bold text-slate-900">Needs review ({pending.length})</h4>
        <div className="mt-2 max-h-64 space-y-3 overflow-y-auto">
          {pending.map((item) => <div key={item.id} className="rounded-lg border border-amber-100 bg-amber-50/50 p-2">
            <p className="text-xs font-semibold text-slate-800">{item.question}</p>
            <textarea aria-label={`Correct answer for ${item.question}`} value={reviewAnswers[item.id] ?? item.answer} onChange={(event) => setReviewAnswers((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 w-full rounded-lg border p-2 text-xs" rows={2} placeholder="Enter the approved answer…" />
            <div className="mt-2 flex gap-2">
              <button type="button" disabled={busy || !(reviewAnswers[item.id] ?? item.answer).trim()} onClick={() => void review(item, 'approved')} className="rounded-lg bg-emerald-700 px-2 py-1 text-xs text-white disabled:opacity-40">Approve</button>
              <button type="button" disabled={busy} onClick={() => void review(item, 'rejected')} className="rounded-lg border px-2 py-1 text-xs text-slate-600">Reject</button>
            </div>
          </div>)}
        </div>
      </div>}
      <div className="mt-4 border-t pt-3">
        <h4 className="text-xs font-bold text-slate-900">Approved knowledge ({approved.length})</h4>
        <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
          {approved.length ? approved.slice(0, 20).map((item) => <div key={item.id} className="rounded-lg bg-slate-50 p-2"><p className="text-xs font-semibold text-slate-800">{item.question}</p><p className="mt-1 text-xs text-slate-600">{item.answer}</p></div>) : <p className="text-xs text-slate-500">No approved organization answers yet.</p>}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-slate-500">Only company-wide guidance belongs here. Do not enter customer-sensitive details or live prices. Pricing and operational actions still use their existing approval workflows.</p>
    </section>
  );
}
