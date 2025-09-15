// app/page.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, CreditCard, Users, ListChecks } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import WeeklyRevenueCard from "@/components/charts/weekly-revenue-card"; // 👈 NEW

interface Payment {
  id: string;
  amount: number;
  method: string | null;
  date: string;              // DATE
  created_at?: string | null;
}
interface Job {
  id: string;
  owner_id: string;
  customer_id: string;
  scheduled_date: string;    // ISO YYYY-MM-DD (DATE)
  status: "pending" | "done" | "skipped" | null;
  price: number | null;
}
interface Customer {
  id: string;
  owner_id: string;
  name: string;
  is_active: boolean | null;
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
function startOfWeek(d = new Date()) {
  // Monday start (matches our SQL)
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const x = new Date(d);
  x.setDate(d.getDate() + diff);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

// helper to list the 7 ISO dates for this week (Mon..Sun)
function weekIsoDates(weekStart: Date): string[] {
  const arr: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    arr.push(fmtDate(d));
  }
  return arr;
}

export default async function DashboardPage() {
  const ownerId = process.env.NEXT_PUBLIC_DEMO_OWNER_ID || "demo-owner";

  const today = new Date();
  const todayStr = fmtDate(today);

  const weekStart = startOfWeek(today);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7); // exclusive end
  const weekStartStr = fmtDate(weekStart);
  const weekEndStr = fmtDate(weekEnd);

  const [
    jobsTodayRes,
    jobsWeekRes,        // 👈 renamed (we'll use it)
    paymentsWeekRes,
    customersRes,
  ] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, price, status, scheduled_date")
      .eq("scheduled_date", todayStr)
      .eq("owner_id", ownerId),

    supabase
      .from("jobs")
      .select("id, price, status, scheduled_date")
      .gte("scheduled_date", weekStartStr)
      .lt("scheduled_date", weekEndStr)
      .eq("owner_id", ownerId),

    supabase
      .from("payments")
      .select("id, amount, method, date, created_at")
      .eq("owner_id", ownerId)
      .gte("date", weekStartStr)
      .lt("date", weekEndStr)
      .order("date", { ascending: false }),

    supabase
      .from("customers")
      .select("id, is_active")
      .eq("owner_id", ownerId)
      .eq("is_active", true),
  ]);

  if (jobsTodayRes.error) console.error("jobsToday error:", jobsTodayRes.error);
  if (jobsWeekRes.error) console.error("jobsWeek error:", jobsWeekRes.error);
  if (paymentsWeekRes.error) console.error("paymentsThisWeek error:", paymentsWeekRes.error);
  if (customersRes.error) console.error("customers (active) error:", customersRes.error);

  const jobsToday = (jobsTodayRes.data ?? []) as Job[];
  const jobsThisWeek = (jobsWeekRes.data ?? []) as Job[];
  const paymentsThisWeek = (paymentsWeekRes.data ?? []) as Payment[];
  const activeCustomers = (customersRes.data ?? []) as Customer[];

  const completedToday = jobsToday.filter((j) => j.status === "done").length;
  // Keep consistent with your card copy: "based on job prices"
  const revenueToday = jobsToday.reduce<number>((sum, j) => sum + (j.price || 0), 0);

  // Weekly payments total (money received)
  const paymentsTotal = paymentsThisWeek.reduce<number>(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  // --- Build weekly revenue data (based on job prices, per scheduled day)
  const weekDays = weekIsoDates(weekStart);
  const map = new Map<string, number>();
  for (const iso of weekDays) map.set(iso, 0);

  for (const j of jobsThisWeek) {
    const iso = j.scheduled_date.slice(0, 10);
    if (!map.has(iso)) continue;
    map.set(iso, (map.get(iso) || 0) + (Number(j.price) || 0));
  }

  const weeklyRevenueData = weekDays.map((iso) => ({
    date: iso,
    revenue: map.get(iso) || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top 4 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Jobs Today</CardTitle>
            <ListChecks className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobsToday.length}</div>
            <p className="text-xs text-muted-foreground">{completedToday} completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCustomers.length}</div>
            <p className="text-xs text-muted-foreground">across all rounds</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (Today)</CardTitle>
            <CreditCard className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{revenueToday.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">based on job prices</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Payments (This Week)</CardTitle>
            <CalendarDays className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{paymentsTotal.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">received</p>
          </CardContent>
        </Card>
      </div>

      {/* 👇 NEW: Weekly Revenue graph (between top cards and Today's Jobs) */}
      <WeeklyRevenueCard
        data={weeklyRevenueData}
        currency="GBP"
        title="Revenue (This Week)"
        description="Day-by-day over the last 7 days"
        showGrid
      />

      {/* Bottom two cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today’s Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {jobsToday.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs scheduled today.</p>
            ) : (
              <ul className="space-y-2">
                {jobsToday.map((j) => (
                  <li
                    key={j.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          j.status === "done"
                            ? "default"
                            : j.status === "skipped"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {j.status || "pending"}
                      </Badge>
                      <span className="text-sm">Job #{j.id.slice(0, 6)}</span>
                    </div>
                    <div className="text-sm font-medium">
                      £{(j.price || 0).toFixed(0)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-2">
              <Button variant="outline" asChild>
                <a href="/today" className="inline-flex items-center">
                  Go to Today <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paymentsThisWeek.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payments yet this week.</p>
            ) : (
              <ul className="space-y-2">
                {paymentsThisWeek.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <span className="text-sm">
                      {new Date(p.date).toLocaleDateString()} • {p.method || "—"}
                    </span>
                    <span className="text-sm font-medium">
                      £{Number(p.amount).toFixed(0)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="pt-2">
              <Button variant="outline" asChild>
                <a href="/payments" className="inline-flex items-center">
                  View all <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
