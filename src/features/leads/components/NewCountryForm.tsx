"use client";

import React from 'react';

// Minimal Market type for the dropdown.  Only id and name are required.
type Market = { id: string; name: string };

interface NewCountryFormProps {
  markets: Market[];
  newCountryName: string;
  setNewCountryName: (value: string) => void;
  newCountryIso2: string;
  setNewCountryIso2: (value: string) => void;
  newCountryIso3: string;
  setNewCountryIso3: (value: string) => void;
  newCountryPhone: string;
  setNewCountryPhone: (value: string) => void;
  newCountryMarketId: string;
  setNewCountryMarketId: (value: string) => void;
  inputClassName: () => string;
  onCancel: () => void;
  onSave: () => void;
}

/**
 * Renders a small form for creating a new country within the lead drawer.
 * The parent component maintains the state for each field and passes
 * setters as props.  When the user saves, the parent should call
 * its own handler to persist the new country via a server action.
 */
export default function NewCountryForm({
  markets,
  newCountryName,
  setNewCountryName,
  newCountryIso2,
  setNewCountryIso2,
  newCountryIso3,
  setNewCountryIso3,
  newCountryPhone,
  setNewCountryPhone,
  newCountryMarketId,
  setNewCountryMarketId,
  inputClassName,
  onCancel,
  onSave,
}: NewCountryFormProps) {
  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 p-3">
      <input
        type="text"
        placeholder="Country name"
        value={newCountryName}
        onChange={(e) => setNewCountryName(e.target.value)}
        className={inputClassName()}
        required
      />
      <div className="grid gap-2 sm:grid-cols-3">
        <input
          type="text"
          placeholder="ISO2"
          value={newCountryIso2}
          onChange={(e) => setNewCountryIso2(e.target.value)}
          className={inputClassName()}
        />
        <input
          type="text"
          placeholder="ISO3"
          value={newCountryIso3}
          onChange={(e) => setNewCountryIso3(e.target.value)}
          className={inputClassName()}
        />
        <input
          type="text"
          placeholder="Phone code"
          value={newCountryPhone}
          onChange={(e) => setNewCountryPhone(e.target.value)}
          className={inputClassName()}
        />
      </div>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Market</span>
        <select
          value={newCountryMarketId}
          onChange={(e) => setNewCountryMarketId(e.target.value)}
          className={inputClassName()}
        >
          <option value="">No market selected</option>
          {markets.map((market) => (
            <option key={market.id} value={market.id}>{market.name}</option>
          ))}
        </select>
      </label>
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