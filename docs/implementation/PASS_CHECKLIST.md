# SETU Flow Implementation Pass Checklist

Use this checklist before and after every repo pass. Do not start random fixes without linking the work to the roadmap.

---

## 1. Before changing code

- [ ] Read `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`.
- [ ] Read `docs/implementation/DO_NOT_REGRESS.md`.
- [ ] Read `docs/implementation/CHANGELOG_DECISIONS.md`.
- [ ] Confirm latest Vercel deployment status.
- [ ] Identify the sprint this work belongs to.
- [ ] Identify the smallest safe change that moves the sprint forward.
- [ ] Identify files likely to change.
- [ ] Identify what Setu Guru must learn from this pass.
- [ ] Identify what must not change.
- [ ] Ask Ritesh for explicit approval before making repo changes.
- [ ] After approval, make the approved change directly to GitHub `main` unless Ritesh asks for a branch or PR.

---

## 2. During implementation

- [ ] Keep UI copy human and non-technical.
- [ ] Do not put dev notes/debug text on user-facing screens.
- [ ] Prefer snapshot + essentials + advanced collapse for drawers and forms.
- [ ] Keep quote/product/lead workflows action-led.
- [ ] Preserve existing successful behavior.
- [ ] Update or add Setu Guru docs/context/policy in the same pass.
- [ ] Use Supabase/Vercel tools when schema/build truth is needed.
- [ ] Do not run `npm ci` in the sandbox.
- [ ] Keep commits small enough to review and tied to the approved pass.

---

## 3. Required Setu Guru update

Every pass must update at least one of:

- `docs/help/*`
- `docs/setu-guru/*`
- `src/lib/setu-guru/page-context.ts`
- `src/lib/setu-guru/help-registry.ts`
- `src/lib/setu-guru/guru-response-policy.ts`
- `/api/setu-guru/*`
- Setu Guru widget route/context behavior

If no Setu Guru update is needed, document why in `CHANGELOG_DECISIONS.md`.

---

## 4. Required manual checks

For every pass, check the most relevant items:

- [ ] Vercel deployment is READY or current error is identified.
- [ ] The changed route opens.
- [ ] Main CTA works.
- [ ] Drawer/modal can close.
- [ ] Save/action button is not broken.
- [ ] Setu Guru input keeps focus while typing.
- [ ] Setu Guru suggested buttons navigate or trigger the correct action.
- [ ] Existing quote/product/lead/compliance fixes are not regressed.

---

## 5. End-of-pass report format

Use this exact format:

```text
Build status: READY / BUILDING / ERROR
Latest commit:
Files changed:
Sprint:
User-visible change:
Setu Guru knowledge updated:
Do-not-regress checked:
Overall CRM readiness: __%
Current sprint completion: __%
Setu Guru intelligence readiness: __%
Next pass:
```

---

## 6. If build fails

1. Fetch Vercel build logs.
2. Fix only the failing build issue first.
3. Do not start a new feature while production build is failing.
4. Re-check Vercel.
5. Record the failure and fix in `CHANGELOG_DECISIONS.md`.

---

## 7. If user starts a new chat

Tell the new chat to read:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/PASS_CHECKLIST.md`
- `docs/implementation/DO_NOT_REGRESS.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Then continue from the current sprint and latest READY deployment. Ask Ritesh for explicit approval before changing GitHub `main`.
