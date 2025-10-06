// app/customers/page.tsx
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/app/server-supabase";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import CustomersTable from "@/components/customer/customer-table";

interface CustomerRow {
  id: string;
  owner_id: string;
  name: string;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  price: number | null;
  is_active: boolean | null;
}

const PAGE_SIZE = 20;
export const revalidate = 0;

export default async function CustomersPage({
  searchParams,
}: {
  // Next 15 may pass this as a Promise during streaming
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await getServerSupabase();

  // Auth (defensive; middleware already protects)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    redirect("/login?redirectedFrom=/customers");
  }
  const userId = session.user.id;

  let rows: CustomerRow[] = [];
  let total = 0;

  const { data, count, error } = await supabase
    .from("customers")
    .select(
      "id, owner_id, name, address_line1, city, postcode, price, is_active",
      { count: "exact" }
    )
    .eq("owner_id", userId)
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    console.error("customers list error:", error);
  }

  rows = data || [];
  total = count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AppShell>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Customers</CardTitle>
          <Button asChild>
            <a href="/customers/new">Add Customer</a>
          </Button>
        </CardHeader>

        <CardContent>
          <Table>
            <CustomersTable rows={rows} />
          </Table>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={`/customers?page=${Math.max(1, page - 1)}`}>Prev</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/customers?page=${Math.min(totalPages, page + 1)}`}>Next</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppShell>
  );
}
