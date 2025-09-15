// app/customers/page.tsx
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

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

export default async function CustomersPage({
  // 👇 Next can pass searchParams as a Promise now
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // ✅ await searchParams before using it
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp?.page || "1", 10) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // ✅ await cookies() (can be async in newer Next)
  const cookieStore = await cookies();

  // Adapter for Supabase SSR client
  const cookieAdapter = {
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(_name: string, _value: string, _options: CookieOptions) {
      /* no-op in server components */
    },
    remove(_name: string, _options: CookieOptions) {
      /* no-op in server components */
    },
  } as {
    get(name: string): string | undefined;
    set(name: string, value: string, options: CookieOptions): void;
    remove(name: string, options: CookieOptions): void;
  };

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieAdapter }
  );

  // ✅ More secure on the server than getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userId = user?.id ?? null;

  let rows: CustomerRow[] = [];
  let total = 0;

  if (userId) {
    const { data, count } = await supabase
      .from("customers")
      .select(
        "id, owner_id, name, address_line1, city, postcode, price, is_active",
        { count: "exact" }
      )
      .eq("owner_id", userId)
      .order("name", { ascending: true })
      .range(from, to);

    rows = data || [];
    total = count ?? rows.length;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Customers</CardTitle>
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
  );
}
