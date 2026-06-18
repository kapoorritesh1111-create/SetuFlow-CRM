'use server';

import { redirect } from 'next/navigation';

import { provisionTradeShowTrialSignup } from '@/lib/trial/trade-show-signup';

type TradeShowTrialActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

function formValue(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

export async function startTradeShowTrial(
  _previousState: TradeShowTrialActionState,
  formData: FormData,
): Promise<TradeShowTrialActionState> {
  const result = await provisionTradeShowTrialSignup({
    fullName: formValue(formData, 'fullName'),
    company: formValue(formData, 'company'),
    email: formValue(formData, 'email'),
    phoneWhatsapp: formValue(formData, 'phoneWhatsapp'),
    tradeShowName: formValue(formData, 'tradeShowName'),
    boothNumber: formValue(formData, 'boothNumber'),
    mainProductCategory: formValue(formData, 'mainProductCategory'),
  });

  if (!result.ok) {
    return {
      ok: false,
      message: result.message,
      fieldErrors: result.fieldErrors,
    };
  }

  const params = new URLSearchParams({
    email: result.email,
    org: result.organizationId,
    workspace: result.workspacePath,
  });

  if (result.signedIn) {
    params.set('signedIn', '1');
  }

  if (result.attachedExistingUser) {
    params.set('existing', '1');
  }

  redirect(`/trade-show-trial/success?${params.toString()}`);
}
