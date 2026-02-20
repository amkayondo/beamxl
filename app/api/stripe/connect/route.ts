import { NextResponse } from "next/server";

import { env } from "@/env";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { getAppUrl, requireStripeConnectClientId } from "@/server/stripe";
import {
  STRIPE_OAUTH_STATE_COOKIE,
  createSignedStripeOAuthState,
} from "@/server/services/stripe-oauth-state";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  let stripeConnectClientId: string;
  try {
    stripeConnectClientId = requireStripeConnectClientId();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Missing Stripe Connect client id",
      },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const requestedOrgSlug = url.searchParams.get("orgSlug");

  if (!orgId || !requestedOrgSlug) {
    return NextResponse.json(
      { error: "orgId and orgSlug are required" },
      { status: 400 }
    );
  }

  const [membership, org] = await Promise.all([
    db.query.orgMembers.findFirst({
      where: (m, { and, eq, isNull }) =>
        and(
          eq(m.orgId, orgId),
          eq(m.userId, session.user.id),
          eq(m.status, "ACTIVE"),
          isNull(m.deletedAt)
        ),
    }),
    db.query.orgs.findFirst({
      where: (o, { and, eq, isNull }) =>
        and(eq(o.id, orgId), isNull(o.deletedAt)),
      columns: { id: true, slug: true },
    }),
  ]);

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!org) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (org.slug !== requestedOrgSlug) {
    return NextResponse.json(
      { error: "orgSlug does not match orgId" },
      { status: 400 }
    );
  }

  const { state, cookieValue, maxAgeSeconds } = createSignedStripeOAuthState({
    orgId: org.id,
    orgSlug: org.slug,
    userId: session.user.id,
  });

  const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", stripeConnectClientId);
  authorizeUrl.searchParams.set("scope", "read_write");
  authorizeUrl.searchParams.set("redirect_uri", `${getAppUrl()}/api/stripe/callback`);
  authorizeUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set({
    name: STRIPE_OAUTH_STATE_COOKIE,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return response;
}
