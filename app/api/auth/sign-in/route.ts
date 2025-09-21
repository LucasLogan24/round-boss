import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  const { email, password } = await req.json();

  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  // Cookies are now set on the response by the helper
  return NextResponse.json({ ok: true });
}
