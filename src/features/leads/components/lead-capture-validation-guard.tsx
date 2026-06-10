"use client";

import { useEffect } from "react";

function isLeadCaptureForm(form: HTMLFormElement) {
  return Boolean(
    form.querySelector('[name="company_name"]') &&
      (form.querySelector('[name="email"]') ||
        form.querySelector('[name="phone"]') ||
        form.querySelector('[name="whatsapp_number"]')),
  );
}

function hasContactChannel(form: HTMLFormElement) {
  const valueFor = (name: string) =>
    String((form.querySelector(`[name="${name}"]`) as HTMLInputElement | null)?.value ?? "").trim();

  return Boolean(
    valueFor("email") ||
      valueFor("phone") ||
      valueFor("whatsapp_number") ||
      valueFor("whatsapp") ||
      valueFor("phone_secondary"),
  );
}

function leadDrawerPortalRoot(form: HTMLFormElement) {
  const dialog = form.closest('[role="dialog"]') as HTMLElement | null;
  const presentation = dialog?.closest('[role="presentation"]') as HTMLElement | null;
  const bodyChild = presentation?.parentElement === document.body ? presentation : null;
  return bodyChild ?? presentation ?? (dialog?.parentElement as HTMLElement | null) ?? form.parentElement;
}

function bodyChildIndex(element: HTMLElement | null) {
  if (!element) return Number.MAX_SAFE_INTEGER;
  return Array.from(document.body.children).indexOf(element);
}

function pruneDuplicateLeadDrawers() {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form#lead-drawer-form')).filter(isLeadCaptureForm);
  if (forms.length <= 1) return;

  // User proof showed two portal layers after one click: body child 2 and body child 3.
  // Keep the first/original drawer and remove later duplicate portals so one close click
  // fully clears the Quick Lead surface.
  const ranked = forms
    .map((form) => ({ form, root: leadDrawerPortalRoot(form) }))
    .sort((left, right) => bodyChildIndex(left.root) - bodyChildIndex(right.root));

  const keep = ranked[0];
  keep.form.setAttribute("data-lead-drawer-singleton", "active");
  ranked.slice(1).forEach(({ form, root }) => {
    form.setAttribute("data-lead-drawer-singleton", "removed-duplicate");
    if (root && root.parentElement) root.remove();
  });

  keep.form.querySelector<HTMLInputElement>('input[name="company_name"]')?.focus();
}

function scheduleDuplicatePrune() {
  pruneDuplicateLeadDrawers();
  window.requestAnimationFrame(pruneDuplicateLeadDrawers);
  window.setTimeout(pruneDuplicateLeadDrawers, 50);
  window.setTimeout(pruneDuplicateLeadDrawers, 150);
}

function relaxNativeLeadValidation(root: ParentNode = document) {
  root.querySelectorAll("form").forEach((node) => {
    const form = node as HTMLFormElement;
    if (!isLeadCaptureForm(form)) return;

    // The app/server owns lead validation. Browser-native required validation can
    // block valid captures when Email OR Phone OR WhatsApp is present but a
    // hidden/alternate contact field is still marked required.
    form.noValidate = true;
    form.setAttribute("data-lead-contact-validation", "app-owned");

    if (!hasContactChannel(form)) return;

    ["email", "phone", "whatsapp", "whatsapp_number", "phone_secondary"].forEach((name) => {
      const field = form.querySelector(`[name="${name}"]`) as HTMLInputElement | null;
      if (!field) return;
      field.required = false;
      field.removeAttribute("required");
      field.setCustomValidity("");
    });
  });
  scheduleDuplicatePrune();
}

export function LeadCaptureValidationGuard() {
  useEffect(() => {
    relaxNativeLeadValidation();

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const form = target?.closest?.("form") as HTMLFormElement | null;
      if (form && isLeadCaptureForm(form)) relaxNativeLeadValidation(form);
    };

    const onQuickLeadClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const quickLeadLink = target?.closest?.('a[href*="quickLead=1"]') as HTMLAnchorElement | null;
      if (!quickLeadLink) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const openLeadForm = document.querySelector<HTMLFormElement>('form#lead-drawer-form');
      if (openLeadForm) {
        scheduleDuplicatePrune();
        openLeadForm.querySelector<HTMLInputElement>('input[name="company_name"]')?.focus();
        return;
      }

      window.location.assign(quickLeadLink.href);
    };

    const observer = new MutationObserver((mutations) => {
      let sawLeadDrawerChange = false;
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          relaxNativeLeadValidation(node);
          if (node.querySelector?.('form#lead-drawer-form') || node.matches?.('form#lead-drawer-form')) {
            sawLeadDrawerChange = true;
          }
        });
      }
      if (sawLeadDrawerChange) scheduleDuplicatePrune();
    });

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    document.addEventListener("click", onQuickLeadClick, true);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      document.removeEventListener("click", onQuickLeadClick, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
