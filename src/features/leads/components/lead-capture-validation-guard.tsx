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

function closestDrawerRoot(form: HTMLFormElement) {
  const dialog = form.closest('[role="dialog"]') as HTMLElement | null;
  return (
    (dialog?.closest('[role="presentation"]') as HTMLElement | null) ||
    (dialog?.parentElement as HTMLElement | null) ||
    (form.closest('[role="presentation"]') as HTMLElement | null) ||
    (form.closest('.inset-0') as HTMLElement | null) ||
    form.parentElement
  );
}

function leadFormScore(form: HTMLFormElement) {
  const textValue = (name: string) =>
    String((form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "").trim();
  let score = 0;
  ["company_name", "country_id", "contact_name", "job_title", "email", "phone", "whatsapp_number"].forEach((name) => {
    if (textValue(name)) score += 1;
  });
  const root = closestDrawerRoot(form);
  const rect = root?.getBoundingClientRect();
  if (rect && rect.width > 0 && rect.height > 0) score += 2;
  return score;
}

function enforceSingleLeadDrawer() {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form#lead-drawer-form')).filter(isLeadCaptureForm);
  if (forms.length <= 1) {
    forms.forEach((form) => {
      form.setAttribute("data-lead-drawer-singleton", "active");
      form.removeAttribute("aria-hidden");
      const root = closestDrawerRoot(form);
      root?.style.removeProperty("display");
      root?.removeAttribute("aria-hidden");
      form.querySelectorAll<HTMLElement>("input, select, textarea, button").forEach((field) => {
        field.removeAttribute("tabindex");
      });
    });
    return;
  }

  const winner = [...forms].sort((a, b) => leadFormScore(b) - leadFormScore(a))[0];

  forms.forEach((form) => {
    const root = closestDrawerRoot(form);
    const isWinner = form === winner;
    form.setAttribute("data-lead-drawer-singleton", isWinner ? "active" : "suppressed");
    if (isWinner) {
      form.removeAttribute("aria-hidden");
      root?.style.removeProperty("display");
      root?.removeAttribute("aria-hidden");
      form.querySelectorAll<HTMLElement>("input, select, textarea, button").forEach((field) => {
        field.removeAttribute("tabindex");
      });
      return;
    }

    form.setAttribute("aria-hidden", "true");
    root?.setAttribute("aria-hidden", "true");
    form.querySelectorAll<HTMLElement>("input, select, textarea, button").forEach((field) => {
      field.setAttribute("tabindex", "-1");
    });
    if (root) root.style.display = "none";
  });
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
  enforceSingleLeadDrawer();
}

export function LeadCaptureValidationGuard() {
  useEffect(() => {
    relaxNativeLeadValidation();

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const form = target?.closest?.("form") as HTMLFormElement | null;
      if (form && isLeadCaptureForm(form)) relaxNativeLeadValidation(form);
    };

    const observer = new MutationObserver((mutations) => {
      let shouldSync = false;
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            relaxNativeLeadValidation(node);
            shouldSync = true;
          }
        });
      }
      if (shouldSync) window.requestAnimationFrame(enforceSingleLeadDrawer);
    });

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
