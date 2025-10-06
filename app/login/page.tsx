// app/login/page.tsx
"use client";

import { useSupabase } from "@/components/providers/supabase-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const supabase = useSupabase();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectTarget = params.get("redirectedFrom") || "/";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setSubmitting(false);
      setErrorMsg(error.message);
      return;
    }

    // Navigate away so middleware runs on the next request
    router.replace(redirectTarget);
    // Ensure the server-side session is re-read and cookies are synced
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-3 rounded-xl border p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold">Log in</h2>

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@roundboss.com"
          className="w-full rounded-md border px-3 py-2 bg-slate-50"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full rounded-md border px-3 py-2 bg-slate-50"
          required
        />

        {errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
        >
          {submitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
