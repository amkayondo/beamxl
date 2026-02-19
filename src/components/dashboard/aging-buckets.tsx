"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AgingBucketsProps {
  buckets: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
}

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

const segments = [
  { key: "current" as const, label: "Current", color: "bg-green-500" },
  { key: "days1to30" as const, label: "1-30 days", color: "bg-yellow-500" },
  { key: "days31to60" as const, label: "31-60 days", color: "bg-orange-500" },
  { key: "days61to90" as const, label: "61-90 days", color: "bg-red-500" },
  { key: "days90plus" as const, label: "90+ days", color: "bg-red-800" },
] as const;

export function AgingBuckets({ buckets }: AgingBucketsProps) {
  const total =
    buckets.current +
    buckets.days1to30 +
    buckets.days31to60 +
    buckets.days61to90 +
    buckets.days90plus;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aging Buckets</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No outstanding invoices.
          </p>
        ) : (
          <div className="space-y-3">
            {/* Stacked bar */}
            <div className="flex h-8 w-full overflow-hidden rounded-md">
              {segments.map((seg) => {
                const amount = buckets[seg.key];
                if (amount === 0) return null;
                const widthPercent = (amount / total) * 100;
                return (
                  <div
                    key={seg.key}
                    className={`${seg.color} flex min-w-[2px] items-center justify-center text-xs font-medium text-white`}
                    style={{ width: `${widthPercent}%` }}
                    title={`${seg.label}: ${formatUsd(amount)}`}
                  >
                    {widthPercent > 10
                      ? `${Math.round(widthPercent)}%`
                      : null}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
              {segments.map((seg) => (
                <div key={seg.key} className="flex items-center gap-2">
                  <span
                    className={`${seg.color} inline-block h-3 w-3 rounded-sm`}
                  />
                  <div className="text-xs">
                    <p className="font-medium">{seg.label}</p>
                    <p className="text-muted-foreground">
                      {formatUsd(buckets[seg.key])}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
