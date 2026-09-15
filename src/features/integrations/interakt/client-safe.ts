import 'server-only';

import type { InteraktTemplateSendInput, InteraktTemplateSendResult } from './types';
import {
  fetchInteraktContacts,
  getInteraktApiKey,
  normalizeInteraktContact,
  sendInteraktTemplate as sendInteraktTemplateBase,
  sendInteraktText,
} from './client';

export { fetchInteraktContacts, getInteraktApiKey, normalizeInteraktContact, sendInteraktText };

function sanitizeTemplateVariable(value: string) {
  return String(value ?? '')
    .replace(/[\t\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export async function sendInteraktTemplate(input: InteraktTemplateSendInput): Promise<InteraktTemplateSendResult> {
  return sendInteraktTemplateBase({
    ...input,
    bodyValues: (input.bodyValues ?? []).map(sanitizeTemplateVariable),
    headerValues: input.headerValues?.map(sanitizeTemplateVariable),
    buttonValues: input.buttonValues
      ? Object.fromEntries(Object.entries(input.buttonValues).map(([key, values]) => [key, values.map(sanitizeTemplateVariable)]))
      : undefined,
  });
}
