import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { orgIntegrations } from "@/server/db/schema";
import { requireStripeClient } from "@/server/stripe";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  STRIPE_OAUTH_STATE_COOKIE,
  verifySignedStripeOAuthState,
} from "@/server/services/stripe-oauth-state";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(STRIPE_OAUTH_STATE_COOKIE)?.value;

  const verification = verifySignedStripeOAuthState({
    cookieValue,
    state,
    userId: session.user.id,
  });

  if (!code || !verification.ok) {
    const response = NextResponse.redirect(new URL("/?stripe_connect_error=state", request.url));
    response.cookies.set({
      name: STRIPE_OAUTH_STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  const stripe = requireStripeClient();

  try {
    const token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const accountId = token.stripe_user_id;
    if (!accountId) {
      throw new Error("Stripe did not return an account id");
    }

    const payload = verification.payload;
    const existing = await db.query.orgIntegrations.findFirst({
      where: (i, { and, eq }) =>
        and(eq(i.orgId, payload.orgId), eq(i.provider, "stripe")),
    });

    if (existing) {
      await db
        .update(orgIntegrations)
        .set({
          status: "connected",
          stripeAccountId: accountId,
          stripePublishableKey: token.stripe_publishable_key ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(orgIntegrations.orgId, payload.orgId),
            eq(orgIntegrations.provider, "stripe")
          )
        );
    } else {
      await db.insert(orgIntegrations).values({
        orgId: payload.orgId,
        provider: "stripe",
        status: "connected",
        stripeAccountId: accountId,
        stripePublishableKey: token.stripe_publishable_key ?? null,
      });
    }

    await writeAuditLog({
      orgId: payload.orgId,
      actorType: "USER",
      actorUserId: session.user.id,
      action: "STRIPE_CONNECT_CONNECTED",
      entityType: "OrgIntegration",
      entityId: existing?.id ?? payload.orgId,
      after: {
        stripeAccountId: accountId,
      },
    });

    const response = NextResponse.redirect(
      new URL(`/${payload.orgSlug}/settings/billing?connected=1`, request.url)
    );
    response.cookies.set({
      name: STRIPE_OAUTH_STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    const payload = verification.payload;
    const response = NextResponse.redirect(
      new URL(`/${payload.orgSlug}/settings/billing?connected=0`, request.url)
    );
    response.cookies.set({
      name: STRIPE_OAUTH_STATE_COOKIE,
      value: "",
      path: "/",
      maxAge: 0,
    });
    return response;
  }
}
