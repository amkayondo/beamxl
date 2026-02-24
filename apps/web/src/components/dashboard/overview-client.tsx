"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function percent(used: number, included: number) {
  if (included <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.round((used / included) * 100));
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
  onboardingComplete,
  onboardingStep,
}: {
  orgId: string;
  orgName: string;
  onboardingComplete?: boolean;
  onboardingStep?: number;
}) {
  const pathname = usePathname();
  // Derive orgSlug from pathname: first segment after "/"
  const orgSlug = pathname?.split("/")[1] ?? "";
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

  const TOTAL_STEPS = 6;
  const completedSteps = onboardingStep ? onboardingStep - 1 : 0;
  const progressPct = Math.round((completedSteps / TOTAL_STEPS) * 100);

  return (
    <section className="space-y-6">
      {/* Onboarding resume banner — hidden once all 6 steps are done */}
      {!onboardingComplete && (
        <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-5 py-3.5">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-sm font-medium text-blue-900">
                Setup {completedSteps} of {TOTAL_STEPS} steps complete
              </p>
              <div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-blue-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
          <Link
            href={`/${orgSlug}/onboarding`}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Resume setup →
          </Link>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Dashboard analytics for {orgName}.
        </p>
      </div>

      {data.goalWidget ? (
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{data.goalWidget.name}</p>
              <p className="text-muted-foreground">
                {formatUsd(data.goalWidget.progressAmountMinor)} /{" "}
                {formatUsd(data.goalWidget.targetAmountMinor ?? 0)}
              </p>
            </div>
            <span className="font-semibold">{data.goalWidget.goalPercent ?? 0}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${data.goalWidget.goalPercent ?? 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Top-level metric cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total Outstanding"
          value={formatUsd(data.totalOutstanding)}
          sublabel={`${data.invoiceCount.overdue} overdue invoices`}
        />
        <MetricCard
          label="Collected (Month)"
          value={formatUsd(data.totalCollectedThisMonth)}
          sublabel={`30d: ${formatUsd(data.totalCollected30d)}`}
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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Overdue Value"
          value={formatUsd(data.overdueValueMinor)}
          sublabel={`${data.invoiceCount.overdue} overdue`}
        />
        <MetricCard
          label="Active Workflows"
          value={String(data.activeWorkflows)}
          sublabel="Currently running"
        />
        <MetricCard
          label="Credit Meters"
          value={
            data.usage
              ? `SMS ${percent(data.usage.smsUsed, data.usage.smsIncluded)}%`
              : "No cycle usage"
          }
          sublabel={
            data.usage
              ? `Email ${percent(data.usage.emailUsed, data.usage.emailIncluded)}% | Voice ${percent(
                  data.usage.voiceSecondsUsed,
                  data.usage.voiceSecondsIncluded,
                )}%`
              : "-"
          }
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
