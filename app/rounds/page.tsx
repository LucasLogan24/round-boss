// app/rounds/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/app/server-supabase";
import AppShell from "@/components/app-shell";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const revalidate = 0;

interface Round {
  id: string;
  owner_id: string;
  name: string;
  notes: string | null;
  color: string | null;
  is_active: boolean | null;
}
interface RoundCustomer {
  id: string;
  round_id: string;
  customer_id: string;
  route_position: number;
}
interface CustomerLite {
  id: string;
  name: string;
}

export default async function RoundsPage() {
  const supabase = await getServerSupabase();

  // 🔐 Auth (defensive; middleware should also protect)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirectedFrom=/rounds");

  // 1) Fetch rounds for the current user
  const { data: roundsData, error: roundsErr } = await supabase
    .from("rounds")
    .select("id, owner_id, name, notes, color, is_active")
    .eq("owner_id", user.id)
    .order("name", { ascending: true });

  if (roundsErr) console.error("rounds error:", roundsErr);

  const rounds: Round[] = (roundsData || []) as Round[];
  const roundIds = rounds.map((r) => r.id);

  // 2) Fetch round_customers for those rounds
  let rc: RoundCustomer[] = [];
  if (roundIds.length) {
    const { data, error } = await supabase
      .from("round_customers")
      .select("id, round_id, customer_id, route_position")
      .in("round_id", roundIds)
      .order("route_position", { ascending: true });
    if (error) console.error("round_customers error:", error);
    rc = (data || []) as RoundCustomer[];
  }

  // 3) Fetch names for referenced customers
  const custIds = Array.from(new Set(rc.map((x) => x.customer_id)));
  let custs: CustomerLite[] = [];
  if (custIds.length) {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", custIds);
    if (error) console.error("customers (names) error:", error);
    custs = (data || []) as CustomerLite[];
  }

  // 4) Build lookups
  const customerById = new Map<string, CustomerLite>();
  custs.forEach((c) => customerById.set(c.id, c));

  const byRound = new Map<string, RoundCustomer[]>();
  rc.forEach((row) => {
    const list = byRound.get(row.round_id) ?? [];
    list.push(row);
    byRound.set(row.round_id, list);
  });

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Rounds</h1>
        <Button asChild>
          <a href="/rounds/new">New Round</a>
        </Button>
      </div>

      <div className="space-y-4">
        {rounds.length === 0 ? (
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Rounds</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                You haven’t created any rounds yet.
              </p>
              <div className="flex gap-3">
                <Button asChild>
                  <a href="/rounds/new">Create your first round</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/customers">Add customers</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          rounds.map((r) => (
            <Card key={r.id} className="shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{r.name}</CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {(byRound.get(r.id) || []).length} customers
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(byRound.get(r.id) || []).length === 0 ? (
                      <TableRow>
                        <TableCell className="text-sm text-muted-foreground" colSpan={2}>
                          No customers linked.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (byRound.get(r.id) || []).map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.route_position}</TableCell>
                          <TableCell>
                            {customerById.get(row.customer_id)?.name ||
                              `#${row.customer_id.slice(0, 6)}`}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AppShell>
  );
}
