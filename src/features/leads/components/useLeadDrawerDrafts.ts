"use client";

import { useState } from 'react';

/**
 * Centralizes the draft state used by lead-drawer for inline country/market
 * creation.  This keeps the drawer component focused on orchestration while
 * the hook manages low-level draft fields and reset helpers.
 */
export default function useLeadDrawerDrafts() {
  const [showNewCountryForm, setShowNewCountryForm] = useState(false);
  const [newCountryName, setNewCountryName] = useState('');
  const [newCountryIso2, setNewCountryIso2] = useState('');
  const [newCountryIso3, setNewCountryIso3] = useState('');
  const [newCountryPhone, setNewCountryPhone] = useState('');
  const [newCountryMarketId, setNewCountryMarketId] = useState('');
  const [pendingCountryName, setPendingCountryName] = useState('');

  const [showNewMarketForm, setShowNewMarketForm] = useState(false);
  const [newMarketName, setNewMarketName] = useState('');
  const [newMarketCode, setNewMarketCode] = useState('');
  const [pendingMarketName, setPendingMarketName] = useState('');

  const resetMarketDraft = () => {
    setNewMarketName('');
    setNewMarketCode('');
    setShowNewMarketForm(false);
  };

  const resetCountryDraft = () => {
    setNewCountryName('');
    setNewCountryIso2('');
    setNewCountryIso3('');
    setNewCountryPhone('');
    setNewCountryMarketId('');
    setShowNewCountryForm(false);
  };

  return {
    showNewCountryForm,
    setShowNewCountryForm,
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
    pendingCountryName,
    setPendingCountryName,
    showNewMarketForm,
    setShowNewMarketForm,
    newMarketName,
    setNewMarketName,
    newMarketCode,
    setNewMarketCode,
    pendingMarketName,
    setPendingMarketName,
    resetCountryDraft,
    resetMarketDraft,
  };
}