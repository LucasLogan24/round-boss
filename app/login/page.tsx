"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setMsg(error.message);
    router.push("/customers");
  };

  return (
    <div className="mx-auto max-w-sm p-6">
      <h1 className="text-xl font-semibold mb-4">Log in</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          className="border rounded p-2"
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="border rounded p-2"
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button className="border rounded p-2" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
      </form>
    </div>
  );
}
