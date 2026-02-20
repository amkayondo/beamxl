"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CollectionTrendProps {
  data: Array<{ week: string; paidCount: number; totalCount: number }>;
}

export function CollectionTrend({ data }: CollectionTrendProps) {
  const chartData = data.map((d) => ({
    week: d.week,
    rate:
      d.totalCount > 0
        ? Math.round((d.paidCount / d.totalCount) * 100)
        : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Collection Rate (12 Weeks)</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collection data available.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip
                formatter={(value: number | undefined) => [`${value ?? 0}%`, "Collection Rate"]}
                labelFormatter={(label) => `Week of: ${String(label)}`}
              />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
