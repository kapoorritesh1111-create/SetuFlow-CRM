const META_PREFIX = 'SETUFLOW_META:';

export function parseNotesMetadata<T extends Record<string, unknown>>(notes: string | null | undefined): {
  plainNotes: string;
  meta: Partial<T>;
} {
  const value = notes ?? '';
  const index = value.indexOf(META_PREFIX);
  if (index === -1) return { plainNotes: value.trim(), meta: {} };

  const plainNotes = value.slice(0, index).trim();
  const rawMeta = value.slice(index + META_PREFIX.length).trim();

  try {
    const parsed = JSON.parse(rawMeta) as Partial<T>;
    return { plainNotes, meta: parsed && typeof parsed === 'object' ? parsed : {} };
  } catch {
    return { plainNotes: value.trim(), meta: {} };
  }
}

export function composeNotesMetadata<T extends Record<string, unknown>>(
  plainNotes: string | null | undefined,
  meta: T,
) {
  const trimmedNotes = (plainNotes ?? '').trim();
  const serializedMeta = JSON.stringify(meta);
  return trimmedNotes ? `${trimmedNotes}\n\n${META_PREFIX}${serializedMeta}` : `${META_PREFIX}${serializedMeta}`;
}
