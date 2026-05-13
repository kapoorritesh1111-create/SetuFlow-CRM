'use client';

export function OrderPreviewPrintButton() {
  return <button type="button" onClick={() => window.print()}>Download / Print PDF</button>;
}
