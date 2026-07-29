'use client';

import { Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

export const CORE_ACADEMY_SCREENSHOT_BASE_PATH = '/academy/core/screenshots';

export function getCoreAcademyScreenshotPath(filename: string) {
  return `${CORE_ACADEMY_SCREENSHOT_BASE_PATH}/${filename}`;
}

export function CoreAcademyScreenshot({ filename, title }: { filename: string; title: string }) {
  const [isMissing, setIsMissing] = useState(false);
  const src = getCoreAcademyScreenshotPath(filename);

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
    <figure className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
      {/* Native img is intentional: Academy screenshots are static files supplied after deployment. */}
      <img
        src={src}
        alt={`${title} screenshot`}
        loading="lazy"
        onError={() => setIsMissing(true)}
        className="aspect-video w-full bg-white object-contain"
      />
      <figcaption className="border-t border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500">
        {filename}
      </figcaption>
    </figure>
  );
}
