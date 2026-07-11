'use client';

import { useState, type ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';

export function LeadGuruTools({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {open ? (
        <div className="mb-3 w-56 rounded-2xl border border-line bg-surface-1 p-3 shadow