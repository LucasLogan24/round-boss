// app/customers/new/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/app/server-supabase";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default async function NewCustomerPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/login?redirectedFrom=/customers/new");
  }

  // --- Server Action ---
  async function createCustomer(formData: FormData) {
    "use server";

    const supabase = await getServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirectedFrom=/customers/new");

    const name = String(formData.get("name") || "").trim();
    const address_line1 = String(formData.get("address_line1") || "").trim() || null;
    const city = String(formData.get("city") || "").trim() || null;
    const postcode = String(formData.get("postcode") || "").trim() || null;
    const priceRaw = String(formData.get("price") || "").trim();
    const price = priceRaw === "" ? null : Number(priceRaw);
    const is_active = formData.get("is_active") === "on";

    if (!name) {
      throw new Error("Customer name is required.");
    }

    const { error: insertError } = await supabase.from("customers").insert({
      owner_id: user.id,
      name,
      address_line1,
      city,
      postcode,
      price,
      is_active, // ✅ matches your table
    });

    if (insertError) {
      console.error("Insert customer error:", insertError);
      throw new Error(insertError.message);
    }

    revalidatePath("/customers");
    redirect("/customers");
  }

  return (
    <AppShell>
      <div className="max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-4">Add Customer</h1>

        <form action={createCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              name="name"
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="John Smith"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Address line 1</label>
            <input
              type="text"
              name="address_line1"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="12 High Street"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">City</label>
              <input
                type="text"
                name="city"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="Leeds"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Postcode</label>
              <input
                type="text"
                name="postcode"
                className="w-full rounded-md border border-gray-300 px-3 py-2"
                placeholder="LS1 1AA"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Price (£)</label>
            <input
              type="number"
              name="price"
              step="0.01"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              placeholder="0.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Leave blank if you don’t want to set a price yet.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="is_active" defaultChecked id="is_active" />
            <label htmlFor="is_active" className="text-sm">
              Active
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit" className="px-4 py-2">
              Save Customer
            </Button>
            <Button type="button" variant="outline" asChild>
              <a href="/customers">Cancel</a>
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
