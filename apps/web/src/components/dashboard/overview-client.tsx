"use client";

import { api } from "@/trpc/react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { AgingBuckets } from "@/components/dashboard/aging-buckets";
import { CashChart } from "@/components/dashboard/cash-chart";
import { CollectionTrend } from "@/components/dashboard/collection-trend";
import { TopDelinquent } from "@/components/dashboard/top-delinquent";

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function LoadingSkeleton() {
  return (
    <section className="space-y-6">
      <div>
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-xl border bg-muted"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl border bg-muted" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-80 animate-pulse rounded-xl border bg-muted" />
        <div className="h-80 animate-pulse rounded-xl border bg-muted" />
      </div>
      <div className="h-64 animate-pulse rounded-xl border bg-muted" />
    </section>
  );
}

export function OverviewClient({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const { data, isLoading, error } = api.reports.dashboardMetrics.useQuery({
    orgId,
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Overview</h1>
          <p className="text-sm text-destructive">
            Failed to load dashboard metrics. Please try again later.
          </p>
        </div>
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const overallCollectionRate =
    data.invoiceCount.total > 0
      ? Math.round(
          (data.invoiceCount.paid / data.invoiceCount.total) * 100
        )
      : 0;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Dashboard analytics for {orgName}.
        </p>
      </div>

      {/* Top-level metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Outstanding"
          value={formatUsd(data.totalOutstanding)}
          sublabel={`${data.invoiceCount.overdue} overdue`}
        />
        <MetricCard
          label="Collected (30d)"
          value={formatUsd(data.totalCollected30d)}
          sublabel={`${data.invoiceCount.paid} invoices paid`}
        />
        <MetricCard
          label="DSO"
          value={`${data.dso} days`}
          sublabel="Days Sales Outstanding"
        />
        <MetricCard
          label="Collection Rate"
          value={`${overallCollectionRate}%`}
          sublabel={`${data.invoiceCount.paid} of ${data.invoiceCount.total} invoices`}
        />
      </div>

      {/* Aging Buckets */}
      <AgingBuckets buckets={data.agingBuckets} />

      {/* Charts side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        <CashChart data={data.cashCollected} />
        <CollectionTrend data={data.collectionRate} />
      </div>

      {/* Top Delinquent Table */}
      <TopDelinquent data={data.topDelinquent} />
    </section>
  );
}
