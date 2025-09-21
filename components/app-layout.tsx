"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import AppShell from "@/components/app-shell"; // if AppShell is a named export: { AppShell }

const HIDE_ON = ["/login", "/auth"]; // no sidebar on these routes

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hide = HIDE_ON.some((p) => pathname.startsWith(p));
  if (hide) return <>{children}</>;
  return <AppShell>{children}</AppShell>;
}
