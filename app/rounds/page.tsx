// app/rounds/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";

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
  const ownerId = process.env.NEXT_PUBLIC_DEMO_OWNER_ID || "demo-owner";

  // 1) Rounds — make the type explicit
  let rounds: Round[] = [];
  {
    const { data } = await supabase
      .from("rounds")
      .select("id, owner_id, name, notes, color, is_active")
      .eq("owner_id", ownerId)
      .order("name", { ascending: true });
    rounds = (data || []) as Round[];
  }

  const roundIds = rounds.map((r) => r.id);

  // 2) Round customers
  let rc: RoundCustomer[] = [];
  if (roundIds.length) {
    const { data } = await supabase
      .from("round_customers")
      .select("id, round_id, customer_id, route_position")
      .in("round_id", roundIds)
      .order("route_position", { ascending: true });
    rc = (data || []) as RoundCustomer[];
  }

  // 3) Customer names for the ones referenced above
  const custIds = Array.from(new Set(rc.map((x) => x.customer_id)));
  let custs: CustomerLite[] = [];
  if (custIds.length) {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", custIds);
    custs = (data || []) as CustomerLite[];
  }

  // 4) Build quick lookups
  const customerById = new Map<string, CustomerLite>();
  custs.forEach((c) => customerById.set(c.id, c));

  const byRound = new Map<string, RoundCustomer[]>();
  rc.forEach((row) => {
    const list = byRound.get(row.round_id) ?? [];
    list.push(row);
    byRound.set(row.round_id, list);
  });

  return (
    <div className="space-y-4">
      {rounds.map((r) => (
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
                  <TableHead>#</TableHead>
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
                      <TableCell className="w-[60px]">{row.route_position}</TableCell>
                      <TableCell>
                        {customerById.get(row.customer_id)?.name || `#${row.customer_id.slice(0, 6)}`}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
