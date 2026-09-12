'use client';

import { useEffect, useId, useState } from 'react';

type RecipientSuggestion = { email: string; name: string | null; company: string | null; source: 'contact' | 'crm' | 'history' };

function recipientFragment(value: string) {
  return value.split(',').pop()?.trim() ?? '';
}

export function CalendarPeopleInput({ value, onChange, placeholder, className, ariaLabel }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string; ariaLabel: string }) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<RecipientSuggestion[]>([]);
  const fragment = recipientFragment(value);

  useEffect(() => {
    if (fragment.length < 1 || fragment.includes('@') && fragment.includes('.')) { setSuggestions([]); return; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/mail/recipient-suggestions?q=${encodeURIComponent(fragment)}`, { cache: 'no-store' });
        const payload = await response.json();
        if (active) setSuggestions(response.ok ? payload.suggestions ?? [] : []);
      } catch {
        if (active) setSuggestions([]);
      }
    }, 140);
    return () => { active = false; clearTimeout(timer); };
  }, [fragment]);

  function change(next: string) {
    const selected = suggestions.find(item => item.email.toLowerCase() === next.trim().toLowerCase());
    if (selected && value.includes(',')) {
      const comma = value.lastIndexOf(',');
      onChange(`${value.slice(0, comma + 1)} ${selected.email}`);
      return;
    }
    onChange(next);
  }

  return <>
    <input aria-label={ariaLabel} list={listId} value={value} onChange={event => change(event.target.value)} placeholder={placeholder} className={className} autoComplete="off" />
    <datalist id={listId}>{suggestions.map(item => <option key={item.email} value={item.email}>{[item.name, item.company, item.email].filter(Boolean).join(' · ')}</option>)}</datalist>
  </>;
}
