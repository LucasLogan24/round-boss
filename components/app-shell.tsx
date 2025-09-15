'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LogoutButton } from "@/components/logout-button";

const nav = [
  { href: '/', label: 'Dashboard' },
  { href: '/today', label: 'Today' },
  { href: '/customers', label: 'Customers' },
  { href: '/rounds', label: 'Rounds' },
  { href: '/payments', label: 'Payments' },
];

function NavLinks({ onClick }: { onClick?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((n) => {
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onClick}
            className={`px-3 py-2 rounded-md text-sm ${
              active
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="font-semibold mb-3">Round Boss</div>
                <NavLinks onClick={() => { /* closes drawer via trigger */ }} />
                {/* ✅ Mobile logout at the bottom of the drawer */}
                <div className="mt-6 border-t pt-4">
                  <LogoutButton />
                </div>
              </SheetContent>
            </Sheet>
            <span className="hidden md:block font-semibold">Round Boss</span>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Content with sidebar on desktop */}
      <div className="mx-auto max-w-6xl grid md:grid-cols-[200px_1fr] gap-6 px-4 py-6">
        <aside className="hidden md:block">
          <NavLinks />
          {/* ✅ Desktop logout below nav for clear separation */}
          <div className="mt-6 border-t pt-4">
            <LogoutButton />
          </div>
        </aside>

        <main>{children}</main>
      </div>
    </div>
  );
}

