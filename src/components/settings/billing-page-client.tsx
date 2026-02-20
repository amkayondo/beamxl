"use client";

import { useMemo } from "react";

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
  const { data, isLoading } = api.billing.getState.useQuery({ orgId });

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
    </section>
  );
}
