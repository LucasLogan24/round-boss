// app/customers/new/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type InsertState = "idle" | "saving" | "saved" | "error";

const GBP = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 2,
});

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClientComponentClient(); // ✅ client tied to auth cookies

  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [balanceInput, setBalanceInput] = useState("0.00");

  const [state, setState] = useState<InsertState>("idle");
  const [error, setError] = useState<string | null>(null);

  // Load current user for UX (enable the form). If not signed in, we’ll show an error on submit.
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      setOwnerId(user?.id ?? null);
    })();
    return () => { mounted = false; };
  }, [supabase]);

  function parseBalanceToNumber(value: string): number | null {
    const cleaned = value.replace(/[^\d.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
    }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter a customer name.");
      return;
    }

    const parsedBalance = parseBalanceToNumber(balanceInput);
    if (parsedBalance === null) {
      setError("Please enter a valid balance (e.g., 12.50 or -5).");
      return;
    }

    // 🔒 RLS-safe: fetch the CURRENT user at submit time
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
      setError("You must be signed in to add a customer.");
      return;
    }

    setState("saving");
    const { data, error } = await supabase
      .from("customers")
      .insert([{
        owner_id: user.id,           // must equal auth.uid() for your RLS
        name: trimmedName,
        is_active: isActive,
        address: address.trim() || null,
        balance: parsedBalance,
      }])
      .select("id")
      .single();

    if (error) {
      setState("error");
      setError(error.message ?? "Could not create customer.");
      return;
    }

    setState("saved");
    router.replace(data?.id ? `/customers/${data.id}` : "/customers");
  }

  const balancePreview = (() => {
    const n = parseBalanceToNumber(balanceInput);
    return n === null ? "—" : GBP.format(n);
  })();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60">
        <div className="absolute inset-0 bg-brand-linear" />
        <CardHeader className="relative">
          <CardTitle className="text-xl">Add Customer</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <form onSubmit={onSubmit} className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="name">
                Customer Name <span className="text-destructive">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Jane Smith"
                className="w-full rounded-2xl border border-border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/70"
                autoFocus
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="address">
                Address
              </label>
              <textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g., 22 High Street, Port Talbot, SA13 1AB"
                rows={3}
                className="w-full resize-y rounded-2xl border border-border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/70"
              />
            </div>

            {/* Balance */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground" htmlFor="balance">
                Balance
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="balance"
                  type="text"
                  inputMode="decimal"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="e.g., 12.50 (owed) or -5 (credit)"
                  className="w-full rounded-2xl border border-border bg-background p-3 outline-none focus:ring-2 focus:ring-primary/70"
                />
                <div className="min-w-[96px] text-right text-sm text-muted-foreground">
                  {balancePreview}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Positive = amount the customer owes you. Negative = credit.
              </p>
            </div>

            {/* Active */}
            <div className="flex items-center justify-between rounded-2xl border border-border/60 p-3">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">New customers are active by default</div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 accent-[oklch(var(--primary))]"
                />
                <span className="text-sm">Active</span>
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex items-center gap-2 pt-1">
              {/* only disable while actually saving */}
              <Button type="submit" className="shadow-glow" disabled={state === "saving"}>
                {state === "saving" ? "Saving…" : "Save Customer"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        After saving, you’ll be taken to the customer page or list.
      </div>
    </div>
  );
}
