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
    (dialog?.parentElement?.matches('[role="presentation"]') ? dialog.parentElement : null) ||
    (dialog?.closest('[role="presentation"]') as HTMLElement | null) ||
    (form.closest('[role="presentation"]') as HTMLElement | null) ||
    (form.closest('.fixed.inset-0') as HTMLElement | null) ||
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

function showDrawerRoot(root: HTMLElement | null) {
  if (!root) return;
  root.style.removeProperty("display");
  root.style.removeProperty("visibility");
  root.style.removeProperty("pointer-events");
  root.style.removeProperty("opacity");
  root.removeAttribute("aria-hidden");
  root.removeAttribute("data-lead-drawer-suppressed");
}

function suppressDrawerRoot(root: HTMLElement | null) {
  if (!root) return;
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("data-lead-drawer-suppressed", "true");
  root.style.setProperty("display", "none", "important");
  root.style.setProperty("visibility", "hidden", "important");
  root.style.setProperty("pointer-events", "none", "important");
  root.style.setProperty("opacity", "0", "important");
}

function styleCoachCard(card: HTMLElement) {
  card.style.cssText = [
    "position:sticky",
    "top:0",
    "z-index:40",
    "margin:14px 20px 0",
    "border:1px solid #bfdbfe",
    "border-radius:18px",
    "background:linear-gradient(135deg,#eff6ff 0%,#f8fafc 58%,#ecfeff 100%)",
    "box-shadow:0 18px 45px rgba(12,127,255,.16)",
    "padding:14px 16px",
    "color:#0f172a",
  ].join(";");
}

function appendTextBlock(parent: HTMLElement, text: string, style: string) {
  const item = document.createElement("div");
  item.textContent = text;
  item.style.cssText = style;
  parent.appendChild(item);
}

function appendBadge(parent: HTMLElement, label: string, tone: "blue" | "green") {
  const badge = document.createElement("span");
  badge.textContent = label;
  badge.style.cssText = [
    `border:1px solid ${tone === "green" ? "#bbf7d0" : "#bae6fd"}`,
    `background:${tone === "green" ? "#f0fdf4" : "#fff"}`,
    `color:${tone === "green" ? "#047857" : "#0369a1"}`,
    "border-radius:999px",
    "padding:5px 8px",
    "font-size:10px",
    "font-weight:900",
    "white-space:nowrap",
  ].join(";");
  parent.appendChild(badge);
}

function syncQuickLeadCoach(form: HTMLFormElement) {
  const isNewLead = !String((form.querySelector('[name="lead_id"]') as HTMLInputElement | null)?.value ?? "").trim();
  if (!isNewLead) return;

  const saved = /lead saved|saved/i.test(form.textContent ?? "");
  let card = form.querySelector<HTMLElement>('[data-quick-lead-coach="true"]');
  if (!card) {
    card = document.createElement("aside");
    card.setAttribute("data-quick-lead-coach", "true");
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");
    styleCoachCard(card);
    form.insertBefore(card, form.firstElementChild ?? null);
  }

  const nextState = saved ? "saved" : "start";
  if (card.getAttribute("data-quick-lead-coach-state") === nextState) return;
  card.setAttribute("data-quick-lead-coach-state", nextState);
  card.replaceChildren();

  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:12px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap";
  const copy = document.createElement("div");
  copy.style.cssText = "max-width:780px";
  row.appendChild(copy);

  if (saved) {
    appendTextBlock(copy, "Lead saved", "font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#047857");
    appendTextBlock(copy, "Close this drawer to continue the trial path", "margin-top:5px;font-size:15px;font-weight:900;color:#0f172a");
    appendTextBlock(copy, "Your lead is now in the queue. Close the drawer, open the saved lead, then continue with the next guided step: review details, add product interest, and create a quote when ready.", "margin-top:6px;font-size:12px;line-height:1.55;color:#475569;font-weight:600");
    const badges = document.createElement("div");
    badges.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end";
    appendBadge(badges, "Next: close drawer", "green");
    row.appendChild(badges);
  } else {
    appendTextBlock(copy, "Guided trial step 1", "font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:#0369a1");
    appendTextBlock(copy, "Add your first lead", "margin-top:5px;font-size:15px;font-weight:900;color:#0f172a");
    appendTextBlock(copy, "Use camera scan, upload a PDF/image, or type manually. Choose Buyer or Supplier, add company, country, contact, email/phone/WhatsApp, then select Product, Category, or New request. Save the lead when ready.", "margin-top:6px;font-size:12px;line-height:1.55;color:#475569;font-weight:600");
    const badges = document.createElement("div");
    badges.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end";
    appendBadge(badges, "Camera", "blue");
    appendBadge(badges, "Upload", "blue");
    appendBadge(badges, "Manual", "blue");
    row.appendChild(badges);
  }

  card.appendChild(row);
}

function enforceSingleLeadDrawer() {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>('form#lead-drawer-form')).filter(isLeadCaptureForm);
  if (forms.length <= 1) {
    forms.forEach((form) => {
      form.setAttribute("data-lead-drawer-singleton", "active");
      form.removeAttribute("aria-hidden");
      showDrawerRoot(closestDrawerRoot(form));
      syncQuickLeadCoach(form);
      form.querySelectorAll<HTMLElement>("input, select, textarea, button").forEach((field) => {
        field.removeAttribute("tabindex");
      });
    });
    return;
  }

  // Keep the most complete/oldest form. In the observed bug the top duplicate can
  // block submit, while the underlying original drawer saves correctly.
  const winner = [...forms].sort((a, b) => leadFormScore(b) - leadFormScore(a))[0];

  forms.forEach((form) => {
    const root = closestDrawerRoot(form);
    const isWinner = form === winner;
    form.setAttribute("data-lead-drawer-singleton", isWinner ? "active" : "suppressed");
    if (isWinner) {
      form.removeAttribute("aria-hidden");
      showDrawerRoot(root);
      syncQuickLeadCoach(form);
      form.querySelectorAll<HTMLElement>("input, select, textarea, button").forEach((field) => {
        field.removeAttribute("tabindex");
      });
      return;
    }

    form.setAttribute("aria-hidden", "true");
    form.querySelectorAll<HTMLElement>("input, select, textarea, button").forEach((field) => {
      field.setAttribute("tabindex", "-1");
    });
    suppressDrawerRoot(root);
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
    syncQuickLeadCoach(form);

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
        if (mutation.type === "attributes" || mutation.type === "characterData") shouldSync = true;
      }
      if (shouldSync) window.requestAnimationFrame(enforceSingleLeadDrawer);
    });

    document.addEventListener("input", onInput, true);
    document.addEventListener("change", onInput, true);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true, attributeFilter: ["style", "class", "aria-hidden"] });
    const intervalId = window.setInterval(enforceSingleLeadDrawer, 300);

    return () => {
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("change", onInput, true);
      window.clearInterval(intervalId);
      observer.disconnect();
    };
  }, []);

  return null;
}
