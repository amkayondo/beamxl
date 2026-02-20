"use client";

import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CashChartProps {
  data: Array<{ month: string; totalMinor: number }>;
}

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function CashChart({ data }: CashChartProps) {
  const chartData = data.map((d) => ({
    month: d.month,
    total: d.totalMinor / 100,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Collected (12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No payment data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  `$${(v / 1000).toFixed(0)}k`
                }
              />
              <Tooltip
                formatter={(value: number | undefined) => [formatUsd((value ?? 0) * 100), "Collected"]}
                labelFormatter={(label) => `Month: ${String(label)}`}
              />
              <Bar
                dataKey="total"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
