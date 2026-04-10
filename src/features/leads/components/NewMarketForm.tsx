"use client";

import React from 'react';

interface NewMarketFormProps {
  newMarketName: string;
  setNewMarketName: (value: string) => void;
  newMarketCode: string;
  setNewMarketCode: (value: string) => void;
  inputClassName: () => string;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Renders a small form for creating a new market within the lead drawer.
 * The parent component manages the input state and provides handlers
 * for saving and cancelling.
 */
export default function NewMarketForm({
  newMarketName,
  setNewMarketName,
  newMarketCode,
  setNewMarketCode,
  inputClassName,
  onCancel,
  onSave,
}: NewMarketFormProps) {
  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
      <input
        type="text"
        placeholder="Market name"
        value={newMarketName}
        onChange={(e) => setNewMarketName(e.target.value)}
        className={inputClassName()}
        required
      />
      <input
        type="text"
        placeholder="Market code"
        value={newMarketCode}
        onChange={(e) => setNewMarketCode(e.target.value)}
        className={inputClassName()}
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          className="rounded-2xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Save
        </button>
      </div>
    </div>
  );
}