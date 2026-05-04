"use client";

import { useState, useTransition } from "react";
import { FaIcon } from "@/components/ui/fa-icon";
import { StateMessage } from "@/components/ui/state-message";
import { loginWithUsername, requestPasswordReset } from "@/features/auth/server/actions";

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">{label}</label>;
}

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const [resetEmail, setResetEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();

  return (
    <div className="space-y-5">
      <form className="space-y-5" onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => { void (async () => setState((await loginWithUsername(undefined, formData)) ?? {}))(); });
      }}>
        <input type="hidden" name="next" value={next} />
        <div className="grid gap-4">
          <div className="space-y-2">
            <FieldLabel htmlFor="username" label="Username" />
            <div className="relative">
              <FaIcon icon="user-o" fixedWidth className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
              <input id="username" name="username" type="text" required autoComplete="username" placeholder="your.username" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-[0_10px_24px_rgba(31,72,124,0.06)] outline-none transition placeholder:text-slate-400 focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="password" label="Password" />
              <button type="button" onClick={() => setResetOpen((v) => !v)} className="text-sm font-semibold text-[#1F487C] transition hover:text-[#359F91]">Forgot password?</button>
            </div>
            <div className="relative">
              <FaIcon icon="lock" fixedWidth className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400" />
              <input id="password" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" placeholder="Enter your password" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-[5.75rem] text-sm font-medium text-slate-900 shadow-[0_10px_24px_rgba(31,72,124,0.06)] outline-none transition placeholder:text-slate-400 focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-1/2 inline-flex min-h-9 -translate-y-1/2 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-[#1F487C] transition hover:bg-[#1F487C]/5" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>
                <FaIcon icon={showPassword ? "eye-slash" : "eye"} fixedWidth /><span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
          </div>
        </div>
        {state.error ? <StateMessage title="Sign-in failed" description={state.error} tone="danger" /> : null}
        {state.success ? <StateMessage title="Success" description={state.success} tone="success" /> : null}
        <button type="submit" disabled={isPending} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#1F487C_0%,#0c7fff_120%)] px-5 py-3 text-sm font-bold text-white shadow-[0_16px_34px_rgba(31,72,124,0.22)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60">
          {isPending ? "Signing in..." : "Sign in to workspace"}<FaIcon icon="arrow-right" fixedWidth className="text-xs" />
        </button>
        <p className="text-center text-xs text-slate-500">Use the username your workspace admin assigned to your profile.</p>
      </form>
      <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_10px_28px_rgba(31,72,124,0.05)]">
        <button type="button" onClick={() => setResetOpen((v) => !v)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" aria-expanded={resetOpen}>
          <div><p className="text-sm font-bold text-slate-900">Password help</p><p className="mt-1 text-xs text-slate-500">Send a secure reset link to your account email.</p></div>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1F487C]/5 text-[#1F487C]"><FaIcon icon={resetOpen ? "chevron-up" : "chevron-down"} fixedWidth /></span>
        </button>
        {resetOpen ? (
          <form className="space-y-3 border-t border-slate-100 bg-slate-50 px-5 py-4" onSubmit={(event) => {
            event.preventDefault();
            startResetTransition(() => { void (async () => setState((await requestPasswordReset(resetEmail)) ?? {}))(); });
          }}>
            <div className="space-y-2"><FieldLabel htmlFor="resetEmail" label="Account email" /><input id="resetEmail" type="email" name="resetEmail" placeholder="you@example.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required autoComplete="email" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#359F91] focus:ring-4 focus:ring-[#359F91]/10" /></div>
            <button type="submit" disabled={isResetPending} className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[#1F487C]/15 bg-white px-4 py-3 text-sm font-bold text-[#1F487C] transition hover:bg-[#1F487C]/5 disabled:opacity-60">{isResetPending ? "Sending reset link..." : "Send reset link"}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
