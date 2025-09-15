"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export type DayRevenue = {
  /** ISO date string (YYYY-MM-DD) */
  date: string;
  /** revenue for that date in GBP (or chosen currency) */
  revenue: number;
};

export type WeeklyRevenueCardProps = {
  /** Pre-aggregated day-by-day revenue for the last 7 days */
  data?: DayRevenue[];
  /** Currency code for formatting */
  currency?: string;
  /** UI text */
  title?: string;
  description?: string;
  /** Toggle background grid */
  showGrid?: boolean;
};

// Currency formatter
const fmtCurrency = (amount: number, currency = "GBP") =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);

// Build an ISO-date list for the last 7 days
function last7Days(): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// Ensure every day exists (missing -> £0)
function normalizeWeek(data: DayRevenue[]): DayRevenue[] {
  const map = new Map<string, number>();
  for (const row of data ?? []) map.set(row.date.slice(0, 10), Number(row.revenue) || 0);
  return last7Days().map((iso) => ({ date: iso, revenue: map.get(iso) ?? 0 }));
}

function labelFor(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "2-digit" });
}

export default function WeeklyRevenueCard({
  data = [],
  currency = "GBP",
  title = "Revenue (This Week)",
  description = "Day-by-day over the last 7 days",
  showGrid = true,
}: WeeklyRevenueCardProps) {
  const normalized = React.useMemo(() => normalizeWeek(data), [data]);

  const chartData = normalized.map((d) => ({
    name: labelFor(d.date),
    revenue: d.revenue,
  }));

  const total = normalized.reduce((s, r) => s + (r.revenue || 0), 0);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span>Week total: {fmtCurrency(total, currency)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rb-rev-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {showGrid && (
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="opacity-50" />
              )}
              <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
              <YAxis
                width={60}
                axisLine={false}
                tickLine={false}
                fontSize={12}
                // ✅ FIX #1: type the param to avoid implicit-any
                tickFormatter={(v: number) => fmtCurrency(v, currency)}
              />
              {/* ✅ FIX #2: type the param & return a tuple Recharts accepts */}
              <Tooltip
                cursor={{ strokeOpacity: 0.2 }}
                formatter={(value: number | string) => [
                  fmtCurrency(Number(value) || 0, currency),
                  "Revenue",
                ] as [string, string]}
              />
              <Area type="monotone" dataKey="revenue" strokeOpacity={0} fill="url(#rb-rev-fill)" />
              <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}