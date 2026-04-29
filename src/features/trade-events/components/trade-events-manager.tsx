'use client';

import { useState, useTransition } from 'react';
import RightDrawer, { DrawerActionBar, DrawerSection } from '@/components/RightDrawer';
import { deleteTradeEvent, saveTradeEvent, saveTradeEventCaptureDefaults } from '@/features/trade-events/server/actions';

type TradeEvent = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  starts_on: string | null;
  ends_on: string | null;
  notes: string | null;
  capture_defaults?: { source_label?: string | null; quick_lead_title?: string | null } | null;
};

export function TradeEventsManager({ events }: { events: TradeEvent[] }) {
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TradeEvent | undefined>(undefined);

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingEvent(undefined);
  };

  const runSave = (formData: FormData) => {
    startTransition(() => {
      void saveTradeEvent(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Saved.');
        if (!result?.error) closeDrawer();
      });
    });
  };

  const runDelete = (formData: FormData) => {
    startTransition(() => {
      void deleteTradeEvent(undefined, formData).then((result) => {
        setMessage(result?.error ?? result?.success ?? 'Deleted.');
      });
    });
  };

  const renderFields = (event?: TradeEvent) => (
    <>
      <input type="hidden" name="id" defaultValue={event?.id ?? ''} />
      <input name="name" placeholder="Event name" defaultValue={event?.name ?? ''} required />
      <input name="city" placeholder="City" defaultValue={event?.city ?? ''} />
      <input name="country" placeholder="Country" defaultValue={event?.country ?? ''} />
      <input type="date" name="starts_on" defaultValue={event?.starts_on ?? ''} />
      <input type="date" name="ends_on" defaultValue={event?.ends_on ?? ''} />
      <textarea name="notes" className="md:col-span-2" rows={3} placeholder="Notes" defaultValue={event?.notes ?? ''} />
    </>
  );

  const renderCaptureDefaultFields = (event?: TradeEvent) => (
    <>
      <input type="hidden" name="event_id" defaultValue={event?.id ?? ''} />
      <input name="source_label" placeholder="Quick Lead source label" defaultValue={event?.capture_defaults?.source_label ?? ''} />
      <input name="quick_lead_title" placeholder="Quick Lead default title" defaultValue={event?.capture_defaults?.quick_lead_title ?? ''} />
    </>
  );

  return (
    <div className="space-y-4">
      {message ? <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-700 shadow-soft">{message}</div> : null}

      <button
        type="button"
        onClick={() => {
          setEditingEvent(undefined);
          setDrawerOpen(true);
        }}
        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Add trade event
      </button>

      {events.length ? (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-slate-900">Trade events</h3>
          {events.map((event) => (
            <div key={event.id} className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{event.name}</p>
                <p className="text-xs text-slate-500">{[event.city, event.country].filter(Boolean).join(', ') || 'Location not set'}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 [&>*]:w-full sm:[&>*]:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setEditingEvent(event);
                    setDrawerOpen(true);
                  }}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    const fd = new FormData();
                    fd.append('id', event.id);
                    runDelete(fd);
                  }}
                  className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : (
        <p className="text-sm text-slate-600">No trade events yet.</p>
      )}

      <RightDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingEvent ? 'Edit trade event' : 'Add trade event'}
        description="Keep trade-show planning in the drawer so event updates stay in the current workspace context."
        footer={
          <DrawerActionBar
            title={editingEvent ? 'Update event details' : 'Create event'}
            description="Changes save directly into the existing trade events workflow."
          >
            <button type="button" onClick={closeDrawer} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" form="trade-event-drawer-form" disabled={isPending} className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
              {isPending ? 'Saving…' : editingEvent ? 'Save changes' : 'Create event'}
            </button>
          </DrawerActionBar>
        }
      >
        <form id="trade-event-drawer-form" action={(formData) => runSave(formData)} className="space-y-5">
          <DrawerSection
            title="Event details"
            description="Capture the core logistics and notes without leaving the current page."
          >
            <div className="grid gap-3 md:grid-cols-2">{renderFields(editingEvent)}</div>
          </DrawerSection>
        </form>

        {editingEvent ? (
          <form id="trade-event-capture-defaults-form" action={saveTradeEventCaptureDefaults} className="mt-5 space-y-5">
            <DrawerSection
              title="Quick Lead defaults"
              description="Prefill the Trade Event → Quick Lead handoff once the capture_defaults migration has been applied."
            >
              <div className="grid gap-3 md:grid-cols-2">{renderCaptureDefaultFields(editingEvent)}</div>
              <button type="submit" disabled={isPending} className="mt-3 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                Save Quick Lead defaults
              </button>
            </DrawerSection>
          </form>
        ) : null}
      </RightDrawer>
    </div>
  );
}
