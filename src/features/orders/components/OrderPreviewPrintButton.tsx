'use client';

export function OrderPreviewPrintButton({ pdfHref }: { pdfHref: string }) {
  return <a className="odx-pdf-link" href={pdfHref} target="_blank" rel="noreferrer">Download PDF</a>;
}
