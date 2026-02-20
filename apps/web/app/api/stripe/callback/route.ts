import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { orgIntegrations } from "@/server/db/schema";
import { requireStripeClient } from "@/server/stripe";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  LEGACY_STRIPE_OAUTH_STATE_COOKIE,
  STRIPE_OAUTH_STATE_COOKIE,
  verifySignedStripeOAuthState,
} from "@/server/services/stripe-oauth-state";

function clearOauthStateCookies(response: NextResponse) {
  response.cookies.set({
    name: STRIPE_OAUTH_STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set({
    name: LEGACY_STRIPE_OAUTH_STATE_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const connectError = url.searchParams.get("error");

  const cookieStore = await cookies();
  const cookieValue =
    cookieStore.get(STRIPE_OAUTH_STATE_COOKIE)?.value ??
    cookieStore.get(LEGACY_STRIPE_OAUTH_STATE_COOKIE)?.value;

  const verification = verifySignedStripeOAuthState({
    cookieValue,
    state,
    userId: session.user.id,
  });

  if (!verification.ok) {
    const response = NextResponse.redirect(new URL("/?stripe_connect_error=state", request.url));
    clearOauthStateCookies(response);
    return response;
  }

  if (connectError || !code) {
    const response = NextResponse.redirect(
      new URL(
        `/${verification.payload.orgSlug}/settings/billing?connected=0&reason=${encodeURIComponent(connectError ?? "missing_code")}`,
        request.url
      )
    );
    clearOauthStateCookies(response);
    return response;
  }

  const membership = await db.query.orgMembers.findFirst({
    where: (m, { and, eq, isNull }) =>
      and(
        eq(m.orgId, verification.payload.orgId),
        eq(m.userId, session.user.id),
        eq(m.status, "ACTIVE"),
        isNull(m.deletedAt)
      ),
  });

  if (!membership || membership.role === "MEMBER") {
    const response = NextResponse.redirect(
      new URL(
        `/${verification.payload.orgSlug}/settings/billing?connected=0&reason=forbidden`,
        request.url
      )
    );
    clearOauthStateCookies(response);
    return response;
  }

  const stripe = requireStripeClient();

  try {
    const token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const accountId = token.stripe_user_id;
    if (!accountId || !accountId.startsWith("acct_")) {
      throw new Error("Stripe did not return a valid connected account id");
    }

    const payload = verification.payload;
    const upserted = await db
      .insert(orgIntegrations)
      .values({
        orgId: payload.orgId,
        provider: "stripe",
        status: "connected",
        stripeAccountId: accountId,
        stripePublishableKey: null,
      })
      .onConflictDoUpdate({
        target: [orgIntegrations.orgId, orgIntegrations.provider],
        set: {
          status: "connected",
          stripeAccountId: accountId,
          stripePublishableKey: null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: orgIntegrations.id });

    await writeAuditLog({
      orgId: payload.orgId,
      actorType: "USER",
      actorUserId: session.user.id,
      action: "STRIPE_CONNECT_CONNECTED",
      entityType: "OrgIntegration",
      entityId: upserted[0]?.id ?? payload.orgId,
      after: {
        stripeAccountId: accountId,
      },
    });

    const response = NextResponse.redirect(
      new URL(`/${payload.orgSlug}/settings/billing?connected=1`, request.url)
    );
    clearOauthStateCookies(response);
    return response;
  } catch {
    const payload = verification.payload;
    const response = NextResponse.redirect(
      new URL(`/${payload.orgSlug}/settings/billing?connected=0`, request.url)
    );
    clearOauthStateCookies(response);
    return response;
  }
}
