"use client";

import { useCallback } from 'react';

interface LeadDrawerSubmitHandlersProps {
  onSaveCountry: () => void;
  onSaveMarket: () => void;
  onClose: () => void;
  resetCountryDraft?: () => void;
  resetMarketDraft?: () => void;
}

/**
 * Small orchestration hook for lead drawer inline-submit helpers.
 * This is designed as a cleanup target for the next full repo pass where
 * lead-drawer.tsx is available again.
 */
export default function useLeadDrawerSubmitHandlers({
  onSaveCountry,
  onSaveMarket,
  onClose,
  resetCountryDraft,
  resetMarketDraft,
}: LeadDrawerSubmitHandlersProps) {
  const handleSaveCountry = useCallback(() => {
    onSaveCountry();
    resetCountryDraft?.();
  }, [onSaveCountry, resetCountryDraft]);

  const handleSaveMarket = useCallback(() => {
    onSaveMarket();
    resetMarketDraft?.();
  }, [onSaveMarket, resetMarketDraft]);

  const handleCancel = useCallback(() => {
    resetCountryDraft?.();
    resetMarketDraft?.();
    onClose();
  }, [onClose, resetCountryDraft, resetMarketDraft]);

  return {
    handleSaveCountry,
    handleSaveMarket,
    handleCancel,
  };
}
