// app/today/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";

interface TodayJob {
  id: string;
  owner_id: string;
  customer_id: string;
  price: number | null;
  status: "pending" | "done" | "skipped" | null;
  scheduled_date: string; // DATE
}

interface CustomerLite {
  id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
}

function fmtDate(d: Date) { return d.toISOString().slice(0,10); }

export default async function TodayPage() {
  const ownerId = process.env.NEXT_PUBLIC_DEMO_OWNER_ID || "demo-owner";
  const todayStr = fmtDate(new Date());

  const { data: jobsData } = await supabase
    .from("jobs")
    .select("id, owner_id, customer_id, price, status, scheduled_date")
    .eq("scheduled_date", todayStr)
    .eq("owner_id", ownerId)
    .order("status", { ascending: true });

  const jobs: TodayJob[] = jobsData || [];
  const custIds = Array.from(new Set(jobs.map(j => j.customer_id)));

  let customersById = new Map<string, CustomerLite>();
  if (custIds.length) {
    const { data: custs } = await supabase
      .from("customers")
      .select("id, name, address_line1, city, postcode")
      .in("id", custIds);
    (custs || []).forEach(c => customersById.set(c.id, c as CustomerLite));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today’s Jobs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden md:table-cell">Address</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No jobs today.</TableCell>
              </TableRow>
            ) : (
              jobs.map((j) => {
                const c = customersById.get(j.customer_id);
                const addr = c ? [c.address_line1, c.city, c.postcode].filter(Boolean).join(", ") : "—";
                return (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{c?.name || `#${j.customer_id.slice(0,6)}`}</TableCell>
                    <TableCell className="hidden md:table-cell">{addr}</TableCell>
                    <TableCell>{j.status || "pending"}</TableCell>
                    <TableCell className="text-right">£{(j.price || 0).toFixed(0)}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
