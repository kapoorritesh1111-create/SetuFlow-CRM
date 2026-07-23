'use client';

export function OrderPreviewPrintButton() {
  function openPdf() {
    const basePath = window.location.pathname.replace(/\/$/, '');
    const opened = window.open(`${basePath}/pdf`, '_blank', 'noopener,noreferrer');
    if (opened) opened.opener = null;
  }

  return <button type="button" onClick={openPdf}>Download PDF</button>;
}
