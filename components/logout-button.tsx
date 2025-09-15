"use client";
import { createBrowserClient } from "@supabase/ssr";

export function LogoutButton() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return (
    <button
      className="text-sm opacity-70 hover:opacity-100"
      onClick={() => supabase.auth.signOut().then(() => location.assign("/login"))}
    >
      Log out
    </button>
  );
}