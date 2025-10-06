// app/rounds/new/page.tsx
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSupabase } from "@/app/server-supabase";
import AppShell from "@/components/app-shell";
import { Button } from "@/components/ui/button";

export default async function NewRoundPage() {
  const supabase = await getServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) redirect("/login?redirectedFrom=/rounds/new");

  async function createRound(formData: FormData) {
    "use server";
    const supabase = await getServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirectedFrom=/rounds/new");

    const name = String(formData.get("name") || "").trim();
    const notes = String(formData.get("notes") || "").trim() || null;
    const color = String(formData.get("color") || "").trim() || null;
    const is_active = formData.get("is_active") === "on";

    if (!name) throw new Error("Round name is required.");

    const { error: insertError } = await supabase.from("rounds").insert({
      owner_id: user.id,
      name,
      notes,
      color,
      is_active,
    });
    if (insertError) throw new Error(insertError.message);

    revalidatePath("/rounds");
    redirect("/rounds");
  }

  return (
    <AppShell>
      <div className="max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-4">New Round</h1>
        <form action={createRound} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              name="name"
              required
              className="w-full rounded-md border px-3 py-2"
              placeholder="Tuesday A"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Colour (optional)</label>
            <input
              name="color"
              className="w-full rounded-md border px-3 py-2"
              placeholder="#4f46e5"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              name="notes"
              className="w-full rounded-md border px-3 py-2"
              rows={3}
              placeholder="Any notes about this round…"
            />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" name="is_active" defaultChecked />
            <label htmlFor="is_active" className="text-sm">Active</label>
          </div>

          <div className="flex gap-3">
            <Button type="submit">Save Round</Button>
            <Button variant="outline" asChild>
              <a href="/rounds">Cancel</a>
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
