// app/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSupabase } from "@/app/server-supabase";

import AppShell from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarDays, CreditCard, Users, ListChecks } from "lucide-react";
import WeeklyRevenueCard from "@/components/charts/weekly-revenue-card";

/* ============================
   Force fresh data on each hit
============================ */
export const revalidate = 0;

/* ============================
   Types
============================ */
interface Payment {
  id: string;
  amount: number;
  method: string | null;
  date: string;              // DATE (YYYY-MM-DD)
  created_at?: string | null;
}
interface Job {
  id: string;
  owner_id: string;
  customer_id: string;
  scheduled_date: string;    // DATE (YYYY-MM-DD)
  status: "pending" | "done" | "skipped" | null;
  price: number | null;
}
interface Customer {
  id: string;
  owner_id: string;
  name: string;
  is_active: boolean | null;
}

/* ============================
   London-safe date helpers
============================ */
const TZ = "Europe/London";

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtDateTZ(d: Date, timeZone = TZ): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function toZonedMidnightUTC(d: Date, timeZone = TZ): Date {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  return new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
}
function startOfWeekTZ(d = new Date(), timeZone = TZ): Date {
  const zoned = toZonedMidnightUTC(d, timeZone);
  const day = zoned.getUTCDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const start = new Date(zoned);
  start.setUTCDate(zoned.getUTCDate() + diff);
  return start;
}
function weekIsoDatesFromZonedMonday(zonedMondayUTC: Date): string[] {
  const arr: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(zonedMondayUTC);
    d.setUTCDate(zonedMondayUTC.getUTCDate() + i);
    arr.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
  }
  return arr;
}

/* ============================
   Currency formatters
============================ */
const GBP0 = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  // ✅ Read session via server helper (handles cookies correctly)
  const supabase = await getServerSupabase();
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (!session || sessionError) {
    // Middleware should catch this, but keep a defensive redirect
    redirect("/login?redirectedFrom=/dashboard");
  }

  const ownerId = session.user.id;

  // Dates (Europe/London)
  const today = new Date();
  const todayStr = fmtDateTZ(today, TZ);

  const weekStart = startOfWeekTZ(today, TZ);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekStart.getUTCDate() + 7); // exclusive

  const weekStartStr = `${weekStart.getUTCFullYear()}-${pad(weekStart.getUTCMonth() + 1)}-${pad(
    weekStart.getUTCDate()
  )}`;
  const weekEndStr = `${weekEnd.getUTCFullYear()}-${pad(weekEnd.getUTCMonth() + 1)}-${pad(
    weekEnd.getUTCDate()
  )}`;

  const [jobsTodayRes, jobsWeekRes, paymentsWeekRes, customersRes] = await Promise.all([
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
  const revenueToday = jobsToday.reduce<number>((sum, j) => sum + (j.price || 0), 0);
  const paymentsTotal = paymentsThisWeek.reduce<number>((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Weekly revenue (sum job.price per day)
  const weekDays = weekIsoDatesFromZonedMonday(weekStart);
  const map = new Map<string, number>(weekDays.map((iso) => [iso, 0]));
  for (const j of jobsThisWeek) {
    const iso = j.scheduled_date.slice(0, 10);
    if (!map.has(iso)) continue;
    map.set(iso, (map.get(iso) || 0) + (Number(j.price) || 0));
  }
  const weeklyRevenueData = weekDays.map((iso) => ({ date: iso, revenue: map.get(iso) || 0 }));

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Hero / intro card */}
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-6">
          <div className="absolute inset-0 bg-brand-linear" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Today’s Round</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your rounds flowing. Save notes, skip jobs, reflow automatically.
              </p>
            </div>
            <div className="flex gap-2">
              <Button className="shadow-glow">Start Round</Button>
              <Button variant="outline" asChild>
                <Link href="/customers" className="inline-flex items-center">
                  View Customers <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild>
                <Link href="/customers/new" className="inline-flex items-center">
                  Add Customer <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* KPI tiles */}
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
              <div className="text-2xl font-bold">{GBP0.format(revenueToday)}</div>
              <p className="text-xs text-muted-foreground">based on job prices</p>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Payments (This Week)</CardTitle>
              <CalendarDays className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{GBP0.format(paymentsTotal)}</div>
              <p className="text-xs text-muted-foreground">received</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Revenue graph */}
        <WeeklyRevenueCard
          data={weeklyRevenueData}
          currency="GBP"
          title="Revenue (This Week)"
          description={`Day-by-day (Mon–Sun) for the week starting ${weekDays[0]}`}
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
                    <li key={j.id} className="flex items-center justify-between rounded-lg border p-3">
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
                      <div className="text-sm font-medium">{GBP0.format(j.price || 0)}</div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2">
                <Button variant="outline" asChild>
                  <Link href="/today" className="inline-flex items-center">
                    Go to Today <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
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
                    <li key={p.id} className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">
                        {new Date(p.date).toLocaleDateString("en-GB")} • {p.method || "—"}
                      </span>
                      <span className="text-sm font-medium">{GBP0.format(Number(p.amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-2">
                <Button variant="outline" asChild>
                  <Link href="/payments" className="inline-flex items-center">
                    View all <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
