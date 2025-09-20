// app/dashboard/layout.tsx
import * as React from "react";

export default function DashboardLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      {/* subtle branded glow behind content */}
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />
      <header className="sticky top-0 z-20 border-b border-border/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-lg bg-primary shadow-glow" />
            <span className="font-semibold tracking-wide">RoundBoss</span>
          </div>
          <div className="text-xs text-muted-foreground">Dashboard</div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
