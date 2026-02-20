import { NextResponse } from "next/server";

import { env } from "@/env";
import { getSession } from "@/server/better-auth/server";
import { db } from "@/server/db";
import { getAppUrl } from "@/server/stripe";
import {
  STRIPE_OAUTH_STATE_COOKIE,
  createSignedStripeOAuthState,
} from "@/server/services/stripe-oauth-state";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  if (!env.STRIPE_CONNECT_CLIENT_ID) {
    return NextResponse.json(
      { error: "STRIPE_CONNECT_CLIENT_ID is not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("orgId");
  const orgSlug = url.searchParams.get("orgSlug");

  if (!orgId || !orgSlug) {
    return NextResponse.json(
      { error: "orgId and orgSlug are required" },
      { status: 400 }
    );
  }

  const membership = await db.query.orgMembers.findFirst({
    where: (m, { and, eq, isNull }) =>
      and(
        eq(m.orgId, orgId),
        eq(m.userId, session.user.id),
        eq(m.status, "ACTIVE"),
        isNull(m.deletedAt)
      ),
  });

  if (!membership || membership.role === "MEMBER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { state, cookieValue, maxAgeSeconds } = createSignedStripeOAuthState({
    orgId,
    orgSlug,
    userId: session.user.id,
  });

  const authorizeUrl = new URL("https://connect.stripe.com/oauth/authorize");
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", env.STRIPE_CONNECT_CLIENT_ID);
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
