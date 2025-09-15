// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import AppShell from "@/components/app-shell";
import { AuthGate } from "@/components/auth-gate";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RoundBoss",
  description: "Rounds, jobs, payments — fast.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* Redirects to /login if there's no Supabase session */}
          <AuthGate>
            <AppShell>{children}</AppShell>
          </AuthGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
