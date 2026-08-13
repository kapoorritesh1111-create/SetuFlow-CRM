"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/login';
  return value;
}

export default function ResetPasswordClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  const [newSecret, setNewSecret] = useState("");
  const [confirmSecret, setConfirmSecret] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const next = safeNextPath(searchParams.get("next"));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!newSecret || !confirmSecret) {
      setError("Please enter and confirm your new credential.");
      return;
    }

    if (newSecret !== confirmSecret) {
      setError("The two entries do not match.");
      return;
    }

    if (newSecret.length < 8) {
      setError("The new credential must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newSecret,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token ?? null;
      const completeResponse = await fetch('/api/auth/reset-password/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      });

      if (!completeResponse.ok) {
        const payload = await completeResponse.json().catch(() => null) as { error?: string } | null;
        setError(payload?.error ?? 'Your credential was updated, but the recovery session could not be closed. Please sign out before continuing.');
        return;
      }

      await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
      setNewSecret("");
      setConfirmSecret("");
      setMessage("Your account credential has been updated. Please sign in again.");

      setTimeout(() => {
        router.replace(next);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete account recovery.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">
            SETU FLOW
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-neutral-900">
            Set account access
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            For your security, enter and confirm a new account credential before continuing to the workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div>
            <label
              htmlFor="newSecret"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              New account credential
            </label>
            <input
              id="newSecret"
              name="newSecret"
              type="password"
              value={newSecret}
              onChange={(event) => setNewSecret(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none ring-0"
              placeholder="Enter new credential"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmSecret"
              className="mb-2 block text-sm font-medium text-neutral-800"
            >
              Confirm account credential
            </label>
            <input
              id="confirmSecret"
              name="confirmSecret"
              type="password"
              value={confirmSecret}
              onChange={(event) => setConfirmSecret(event.target.value)}
              className="w-full rounded-xl border px-4 py-3 outline-none ring-0"
              placeholder="Confirm new credential"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          {message ? (
            <p className="text-sm text-green-600">{message}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? "Updating access..." : "Set account access"}
          </button>
        </form>
      </div>
    </main>
  );
}
