// app/layout.tsx
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import SupabaseListener from "@/components/providers/supabase-listener";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <SupabaseListener />
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
