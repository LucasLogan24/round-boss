"use client";

import { useEffect } from "react";
import { useSupabase } from "./supabase-provider";
import { useRouter } from "next/navigation";

export default function SupabaseListener() {
  const supabase = useSupabase();
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      // ensures cookies/route state stay fresh after login/logout
      router.refresh();
    });
    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return null;
}
