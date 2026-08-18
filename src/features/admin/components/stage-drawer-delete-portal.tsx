'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteNextStep, deletePipelineStage } from '@/features/admin/server/stage-delete-actions';

type DrawerEntity = { kind: 'stage' | 'next-step'; id: string } | null;

function entityFromHash(hash: string): DrawerEntity {
  if (hash.startsWith('#stage-')) return { kind: 'stage', id: hash.slice('#stage-'.length) };
  if (hash.startsWith('#next-step-')) return { kind: 'next-step', id: hash.slice('#next-step-'.length) };
  return null;
}

export function StageDrawerDeletePortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [entity, setEntity] = useState<DrawerEntity>(null);

  useEffect(() => {
    const sync = () => {
      const nextEntity = entityFromHash(window.location.hash);
      setEntity(nextEntity);
      if (!nextEntity) {
        setTarget(null);
        return;
      }
      const drawer = document.querySelector(window.location.hash);
      const actionRow = drawer?.querySelector('form > div:last-child');
      setTarget(actionRow instanceof HTMLElement ? actionRow : null);
    };

    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  if (!target || !entity) return null;

  const action = entity.kind === 'stage' ? deletePipelineStage : deleteNextStep;
  const label = entity.kind === 'stage' ? 'Delete stage' : 'Delete next step';
  const confirmation = entity.kind === 'stage'
    ? 'Delete this stage? This is blocked automatically if any lead or stage-history record still references it.'
    : 'Delete this next step? This is blocked automatically if any lead still references it.';

  return createPortal(
    <form
      action={action}
      className="order-first mr-auto"
      onSubmit={(event) => {
        if (!window.confirm(confirmation)) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={entity.id} />
      <button
        type="submit"
        className="inline-flex min-h-8 items-center justify-center rounded-ctl border border-rose-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-50"
      >
        {label}
      </button>
    </form>,
    target,
  );
}
