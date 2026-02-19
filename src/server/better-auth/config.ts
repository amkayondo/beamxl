import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";

import { env } from "@/env";
import { db } from "@/server/db";
import { orgMembers, orgs } from "@/server/db/schema";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          redirectURI: `${env.BETTER_AUTH_URL}/api/auth/callback/google`,
        },
      }
    : undefined;

async function bootstrapDefaultOrg(userId: string) {
  const membership = await db.query.orgMembers.findFirst({
    where: (m, { eq, and, isNull }) =>
      and(eq(m.userId, userId), isNull(m.deletedAt)),
  });

  if (membership) return;

  const slug = `org-${userId.slice(0, 8)}-${Math.floor(Date.now() / 1000)}`;
  const orgId = crypto.randomUUID();

  await db.insert(orgs).values({
    id: orgId,
    slug,
    name: "My Organization",
    createdByUserId: userId,
    defaultCurrency: "USD",
    timezone: "UTC",
  });

  await db.insert(orgMembers).values({
    orgId,
    userId,
    role: "OWNER",
    status: "ACTIVE",
    joinedAt: new Date(),
  });
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"],
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  socialProviders,
  plugins: [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        if (!resend || !env.RESEND_FROM_EMAIL) {
          console.info(`Magic link for ${email}: ${url}`);
          return;
        }

        await resend.emails.send({
          from: env.RESEND_FROM_EMAIL,
          to: email,
          subject: "Your BeamFlow sign-in link",
          html: `<p>Sign in to BeamFlow:</p><p><a href=\"${url}\">Open secure sign-in link</a></p><p>This link expires in 15 minutes.</p>`,
        });
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (createdUser) => {
          await bootstrapDefaultOrg(createdUser.id);
        },
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
