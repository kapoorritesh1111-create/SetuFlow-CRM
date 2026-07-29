'use client';

import { Image as ImageIcon, Maximize2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const CORE_ACADEMY_SCREENSHOT_BASE_PATH = '/academy/core/screenshots';

export function getCoreAcademyScreenshotPath(filename: string) {
  return `${CORE_ACADEMY_SCREENSHOT_BASE_PATH}/${filename}`;
}

export function CoreAcademyScreenshot({ filename, title }: { filename: string; title: string }) {
  const [isMissing, setIsMissing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const src = getCoreAcademyScreenshotPath(filename);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  function close() {
    setIsOpen(false);
    setZoom(1);
  }

  if (isMissing) {
    return (
      <div className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-4">
        <div className="flex items-center gap-2 text-blue-800">
          <ImageIcon className="h-5 w-5" />
          <p className="text-xs font-bold uppercase tracking-[0.14em]">Screenshot placeholder</p>
        </div>
        <p className="mt-2 break-all font-mono text-sm font-bold text-blue-950">{filename}</p>
        <p className="mt-2 text-xs leading-5 text-blue-700">
          Upload this exact filename to <code>public/academy/core/screenshots/</code>. The Academy will display it automatically.
        </p>
        <p className="mt-2 break-all text-[11px] font-semibold text-blue-600">Expected URL: {src}</p>
      </div>
    );
  }

  return (
    <>
      <figure className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative block w-full cursor-zoom-in bg-white text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
          aria-label={`Open ${title} screenshot in zoom viewer`}
        >
          {/* Native img is intentional: Academy screenshots are static files supplied after deployment. */}
          <img
            src={src}
            alt={`${title} screenshot`}
            loading="lazy"
            onError={() => setIsMissing(true)}
            className="aspect-video w-full bg-white object-contain transition duration-200 group-hover:scale-[1.01]"
          />
          <span className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-xl bg-slate-950/85 px-3 py-2 text-xs font-black text-white opacity-90 shadow-lg backdrop-blur transition group-hover:bg-blue-700">
            <Maximize2 className="h-4 w-4" /> Zoom screenshot
          </span>
        </button>
        <figcaption className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500">
          <span className="break-all">{filename}</span>
          <button type="button" onClick={() => setIsOpen(true)} className="shrink-0 font-black text-blue-700 hover:text-blue-900">Open full size</button>
        </figcaption>
      </figure>

      {isOpen ? (
        <div className="fixed inset-0 z-[120] flex flex-col bg-slate-950/95 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${title} screenshot viewer`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-slate-950 px-4 py-3 text-white sm:px-6">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{title}</p>
              <p className="truncate text-xs font-medium text-white/55">{filename}</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setZoom((value) => Math.max(0.5, Number((value - 0.25).toFixed(2))))} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
              <span className="min-w-[68px] text-center text-xs font-black">{Math.round(zoom * 100)}%</span>
              <button type="button" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.25).toFixed(2))))} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom(1)} className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 transition hover:bg-white/20" aria-label="Reset zoom"><RotateCcw className="h-4 w-4" /></button>
              <button type="button" onClick={close} className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-950 transition hover:bg-slate-200" aria-label="Close screenshot viewer"><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4 sm:p-8" onDoubleClick={() => setZoom((value) => value === 1 ? 1.75 : 1)}>
            <div className="flex min-h-full min-w-full items-center justify-center">
              <img
                src={src}
                alt={`${title} screenshot enlarged`}
                className="max-w-none rounded-xl bg-white shadow-2xl transition-transform duration-150"
                style={{ width: `${zoom * 100}%`, minWidth: zoom > 1 ? `${zoom * 100}%` : undefined }}
              />
            </div>
          </div>
          <div className="border-t border-white/10 bg-slate-950 px-4 py-2 text-center text-xs font-medium text-white/50">Use + and − to zoom, double-click to toggle detail view, and press Esc to close.</div>
        </div>
      ) : null}
    </>
  );
}
