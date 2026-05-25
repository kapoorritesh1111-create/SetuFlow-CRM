'use client';

/**
 * LeadsFilterStability is intentionally a no-op compatibility component.
 *
 * Lead filters are controlled by React state in the leads workspace. This
 * component used to attach document-level listeners to infer filter activity
 * from DOM events, which made filter stability depend on rendered markup and
 * control structure. Keeping this component as a no-op preserves existing shell
 * imports while removing the fragile DOM-event coupling.
 */
export function LeadsFilterStability() {
  return null;
}
