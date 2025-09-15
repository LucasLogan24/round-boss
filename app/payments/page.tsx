// app/payments/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/lib/supabaseClient";

interface PaymentRow {
  id: string;
  owner_id: string;
  customer_id: string;
  job_id: string | null;
  amount: number;
  method: string | null;
  date: string; // DATE
  created_at?: string;
}

export default async function PaymentsPage() {
  const ownerId = process.env.NEXT_PUBLIC_DEMO_OWNER_ID || "demo-owner";
  const { data } = await supabase
    .from("payments")
    .select("id, owner_id, customer_id, job_id, amount, method, date, created_at")
    .eq("owner_id", ownerId)
    .order("date", { ascending: false })
    .limit(200);

  const rows: PaymentRow[] = data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No payments found.</TableCell>
              </TableRow>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{new Date(p.date).toLocaleDateString()}</TableCell>
                  <TableCell>{p.method || "—"}</TableCell>
                  <TableCell className="max-w-[28ch] truncate">{/* add payments.note later if you create it */}</TableCell>
                  <TableCell className="text-right">£{Number(p.amount).toFixed(0)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
