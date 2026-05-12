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
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) relaxNativeLeadValidation(node);
        });
      }
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
