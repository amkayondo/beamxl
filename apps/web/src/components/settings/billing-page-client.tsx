"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/trpc/react";

function maskAccountId(accountId: string | null) {
  if (!accountId) return "Not connected";
  if (accountId.length <= 8) return accountId;
  return `${accountId.slice(0, 6)}...${accountId.slice(-4)}`;
}

export function BillingPageClient({
  orgId,
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const utils = api.useUtils();
  const searchParams = useSearchParams();
  const trialExpired = searchParams.get("trialExpired") === "true";
  const { data, isLoading } = api.billing.getState.useQuery({ orgId });
  const { data: usage } = api.billing.usageMeter.useQuery({ orgId });
  const { data: topupPacks } = api.billing.listTopupPacks.useQuery({ orgId });

  const disconnectMutation = api.billing.disconnectConnectAccount.useMutation({
    onSuccess: async () => {
      await utils.billing.getState.invalidate({ orgId });
    },
  });

  const subscriptionMutation = api.billing.createSubscriptionCheckout.useMutation({
    onSuccess: (result) => {
      if (result.url) {
        window.location.href = result.url;
      }
    },
  });

  const topupMutation = api.billing.createTopupCheckout.useMutation({
    onSuccess: (result) => {
      if (result.url) {
        window.location.href = result.url;
      }
    },
  });

  const connectHref = useMemo(
    () =>
      `/api/stripe/connect?orgId=${encodeURIComponent(orgId)}&orgSlug=${encodeURIComponent(orgSlug)}`,
    [orgId, orgSlug]
  );

  const connected = data?.connect.status === "connected";
  const subscriptionStatus =
    data?.subscription.stripeSubscriptionStatus ?? "not_subscribed";

  return (
    <section className="space-y-6">
      {/* Trial-expired hard gate banner */}
      {trialExpired && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-900">Your 14-day trial has ended</p>
          <p className="mt-1 text-sm text-red-700">
            Your data is safe. Add a payment method below to reactivate your account and keep everything you&apos;ve built.
          </p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Connect customer Stripe and manage your DueFlow subscription.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Stripe Connect</CardTitle>
          <Badge>{connected ? "Connected" : "Disconnected"}</Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isLoading ? (
            <p className="text-muted-foreground">Loading connection state...</p>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-muted-foreground">Connected Account</span>
                <span className="font-medium">
                  {maskAccountId(data?.connect.stripeAccountId ?? null)}
                </span>
              </div>

              {!connected ? (
                <a href={connectHref}>
                  <Button>Connect Stripe</Button>
                </a>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => disconnectMutation.mutate({ orgId })}
                  disabled={disconnectMutation.isPending}
                >
                  {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>DueFlow Subscription</CardTitle>
          <Badge>{subscriptionStatus}</Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Plan Price ID</span>
            <span className="font-medium">
              {data?.subscription.stripePriceId ?? "default"}
            </span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-muted-foreground">Subscription</span>
            <span className="font-medium">
              {data?.subscription.stripeSubscriptionId ?? "Not active"}
            </span>
          </div>
          <Button
            onClick={() => subscriptionMutation.mutate({ orgId })}
            disabled={subscriptionMutation.isPending}
          >
            {subscriptionMutation.isPending
              ? "Creating checkout..."
              : "Start Subscription Checkout"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usage Meter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">SMS</span>
            <span>{usage ? `${usage.smsUsed} / ${usage.smsIncluded}` : "-"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Email</span>
            <span>{usage ? `${usage.emailUsed} / ${usage.emailIncluded}` : "-"}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border pb-2">
            <span className="text-muted-foreground">Voice (sec)</span>
            <span>
              {usage ? `${usage.voiceSecondsUsed} / ${usage.voiceSecondsIncluded}` : "-"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">WhatsApp</span>
            <span>{usage ? `${usage.whatsappUsed} / ${usage.whatsappIncluded}` : "-"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit Top-up Packs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(topupPacks ?? []).map((pack) => (
            <div
              key={pack.code}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <div className="space-y-1">
                <p className="font-medium">{pack.name}</p>
                <p className="text-xs text-muted-foreground">
                  +{pack.smsCredits} SMS, +{pack.emailCredits} Email, +{pack.voiceSeconds}s Voice
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => topupMutation.mutate({ orgId, packCode: pack.code })}
                disabled={topupMutation.isPending}
              >
                ${(pack.priceMinor / 100).toFixed(2)}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}
