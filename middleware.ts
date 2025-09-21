import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Tie Supabase to request/response cookies (handles refresh tokens too)
  const supabase = createMiddlewareClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Adjust this list to cover the parts of your app that require login
  const protectedPrefixes = ["/dashboard", "/today", "/customers", "/rounds", "/payments"];

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthRoute = pathname.startsWith("/login") || pathname.startsWith("/auth");

  if (!session && isProtected && !isAuthRoute) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return res;
}

// Run on everything except static assets/images
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
