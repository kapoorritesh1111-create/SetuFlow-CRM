'use client';

import { useState } from 'react';
import { workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';

const FORM_ID = 'pricing-v5-waste-form';
const PUBLISH_BUTTON_ID = 'pricing-v5-waste-publish';

export default function PricingV5ExternalPublishButton() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  function publish() {
    const form = document.getElementById(FORM_ID);
    const publishButton = document.getElementById(PUBLISH_BUTTON_ID);

    if (!(form instanceof HTMLFormElement) || !(publishButton instanceof HTMLButtonElement)) {
      return;
    }

    setIsSubmitting(true);
    form.requestSubmit(publishButton);
  }

  return (
    <button
      type="button"
      onClick={publish}
      disabled={isSubmitting}
      aria-live="polite"
      className={`${workspacePrimaryButtonClass} rounded-ctl px-4 py-2 text-xs font-bold disabled:cursor-wait disabled:opacity-60`}
    >
      {isSubmitting ? 'Publishing…' : 'Save All & Publish'}
    </button>
  );
}
