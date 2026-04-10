"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { StateMessage } from "@/components/ui/state-message";
import {
  loginWithUsername,
  requestPasswordReset,
} from "@/features/auth/server/actions";

function FieldLabel({ htmlFor, label }: { htmlFor: string; label: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-slate-700">
      {label}
    </label>
  );
}

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, setState] = useState<{ error?: string; success?: string }>({});
  const [resetEmail, setResetEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isResetPending, startResetTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          startTransition(() => {
            void (async () => {
              const result = await loginWithUsername(undefined, formData);
              setState(result ?? {});
            })();
          });
        }}
      >
        <input type="hidden" name="next" value={next} />

        <div className="grid gap-5">
          <div className="space-y-2">
            <FieldLabel htmlFor="username" label="Username" />
            <input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
              placeholder="your.username"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel htmlFor="password" label="Password" />
              <Link
                href="/reset-password"
                className="text-sm font-medium text-teal-600 transition hover:text-teal-700"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Enter your password"
            />
          </div>
        </div>

        {state.error ? <StateMessage title="Sign-in failed" description={state.error} tone="danger" /> : null}
        {state.success ? <StateMessage title="Success" description={state.success} tone="success" /> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 min-w-32 items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? "Signing in..." : "Sign in"}
          </button>
          <p className="text-xs text-slate-500">Use the same username your workspace admin assigned to your profile.</p>
        </div>
      </form>

      <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5">
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Send password reset email
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Enter your account email and we will send you a reset link.
          </p>
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();

            startResetTransition(() => {
              void (async () => {
                const result = await requestPasswordReset(resetEmail);
                setState(result ?? {});
              })();
            });
          }}
        >
          <div className="space-y-2">
            <FieldLabel htmlFor="resetEmail" label="Account email" />
            <input
              id="resetEmail"
              type="email"
              name="resetEmail"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={isResetPending}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
          >
            {isResetPending ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  );
}
