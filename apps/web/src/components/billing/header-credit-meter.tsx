"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/react";

type MeterChannel = {
  label: string;
  used: number;
  included: number;
};

function channelPct(channel: MeterChannel) {
  if (channel.included <= 0) {
    return channel.used > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((channel.used / channel.included) * 100));
}

function channelColor(pct: number) {
  if (pct >= 100) return "bg-rose-500";
  if (pct >= 80) return "bg-amber-500";
  return "bg-emerald-500";
}

export function HeaderCreditMeter({
  orgId,
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const { data, isLoading } = api.billing.usageMeter.useQuery(
    { orgId },
    { refetchInterval: 60_000 },
  );

  if (isLoading || !data) {
    return <Badge variant="outline">Credits: loading</Badge>;
  }

  const channels: MeterChannel[] = [
    { label: "SMS", used: data.smsUsed, included: data.smsIncluded },
    { label: "Email", used: data.emailUsed, included: data.emailIncluded },
    { label: "Voice", used: data.voiceSecondsUsed, included: data.voiceSecondsIncluded },
  ];

  const percentages = channels.map(channelPct);
  const maxPct = percentages.length ? Math.max(...percentages) : 0;
  const warning = maxPct >= 80 && maxPct < 100;
  const hardStop = maxPct >= 100 && data.overageMode === "HARD_STOP";

  return (
    <details className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground">
        <span>Credits</span>
        <span className="font-medium text-foreground">{maxPct}%</span>
        {warning ? <Badge className="bg-amber-500/10 text-amber-700">80% warning</Badge> : null}
        {hardStop ? <Badge className="bg-rose-500/10 text-rose-700">Hard stop</Badge> : null}
      </summary>

      <div className="absolute right-0 mt-2 w-72 rounded-lg border border-border bg-background p-3 shadow-lg">
        <div className="space-y-2">
          {channels.map((channel) => {
            const pct = channelPct(channel);
            return (
              <div key={channel.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{channel.label}</span>
                  <span className="font-medium">
                    {channel.used} / {channel.included}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
                  <div className={`h-full ${channelColor(pct)}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Mode: {data.overageMode}</span>
          <Link href={`/${orgSlug}/settings/billing`} className="font-medium text-primary hover:underline">
            Add credits
          </Link>
        </div>
      </div>
    </details>
  );
}
