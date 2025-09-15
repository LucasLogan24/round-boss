// lib/revenue.ts
import { createClient } from "@supabase/supabase-js";

export type DayRevenue = { date: string; revenue: number };

/**
 * Fetch revenue for the last 7 calendar days from Supabase.
 * Adjust table/column names in the SELECT + filters to match your schema.
 *
 * Assumes:
 *  - table: jobs
 *  - columns: completed_at (date/timestamp), price (numeric), status ('completed')
 */
export async function getWeeklyRevenueFromSupabase(): Promise<DayRevenue[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(url, key);

  // Date window: last 7 calendar days (including today)
  const today = new Date();
  const start = new Date();
  start.setDate(today.getDate() - 6);
  const from = start.toISOString().slice(0, 10);
  const to = today.toISOString().slice(0, 10);

  // 🔁 EDIT HERE if your table/columns differ
  const { data, error } = await supabase
    .from("jobs")
    .select("completed_at, price, status")
    .gte("completed_at", from)
    .lte("completed_at", to)
    .eq("status", "completed");

  if (error) {
    console.error("Supabase weekly revenue error:", error);
    return [];
  }

  // Group in JS by day (ISO yyyy-mm-dd)
  const map = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ completed_at: string; price: number }>) {
    const iso = new Date(row.completed_at).toISOString().slice(0, 10);
    map.set(iso, (map.get(iso) ?? 0) + Number(row.price || 0));
  }

  // Return sparse list (component fills missing days with 0)
  return [...map.entries()]
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
