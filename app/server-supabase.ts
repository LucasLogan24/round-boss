// app/server-supabase.ts
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerSupabase() {
  // In your environment, cookies() is async → await it.
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Now cookieStore is the resolved ReadonlyRequestCookies
          return cookieStore.get(name)?.value;
        },
        // No-ops here because in server components we only need to read.
        set() {},
        remove() {},
      },
    }
  );
}

