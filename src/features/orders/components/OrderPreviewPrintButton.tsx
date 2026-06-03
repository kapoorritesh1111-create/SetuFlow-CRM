'use client';

export function OrderPreviewPrintButton() {
  function openPdf() {
    const basePath = window.location.pathname.replace(/\/$/, '');
    window.location.href = `${basePath}/pdf`;
  }

  return <button type="button" onClick={openPdf}>Download PDF</button>;
}
