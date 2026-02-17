import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { writeAuditLog } from "@/server/services/audit.service";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { orgMembers, orgs } from "@/server/db/schema";

function slugifyOrgName(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 30);
  return `${base || "org"}-${Math.floor(Date.now() / 1000)}`;
}

export const orgRouter = createTRPCRouter({
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.query.orgMembers.findMany({
      where: (m, { and, eq, isNull }) =>
        and(eq(m.userId, ctx.session.user.id), isNull(m.deletedAt)),
      with: {
        org: true,
      },
    });

    return rows.map((row) => ({
      orgId: row.orgId,
      name: row.org.name,
      slug: row.org.slug,
      role: row.role,
      status: row.status,
      defaultCurrency: row.org.defaultCurrency,
    }));
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        timezone: z.string().default("UTC"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = crypto.randomUUID();
      const slug = slugifyOrgName(input.name);

      await ctx.db.insert(orgs).values({
        id: orgId,
        slug,
        name: input.name,
        timezone: input.timezone,
        createdByUserId: ctx.session.user.id,
        defaultCurrency: "USD",
      });

      await ctx.db.insert(orgMembers).values({
        orgId,
        userId: ctx.session.user.id,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(),
      });

      await writeAuditLog({
        orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "ORG_CREATED",
        entityType: "Organization",
        entityId: orgId,
        after: { name: input.name, slug },
      });

      return { orgId, slug };
    }),

  ensureDefaultOrg: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db.query.orgMembers.findFirst({
      where: (m, { eq, and, isNull }) =>
        and(eq(m.userId, ctx.session.user.id), isNull(m.deletedAt)),
      with: {
        org: true,
      },
    });

    if (existing) {
      return {
        orgId: existing.orgId,
        slug: existing.org.slug,
      };
    }

    const orgId = crypto.randomUUID();
    const slug = `org-${ctx.session.user.id.slice(0, 8)}-${Math.floor(Date.now() / 1000)}`;

    await ctx.db.insert(orgs).values({
      id: orgId,
      slug,
      name: "My Organization",
      createdByUserId: ctx.session.user.id,
      defaultCurrency: "USD",
      timezone: "UTC",
    });

    await ctx.db.insert(orgMembers).values({
      orgId,
      userId: ctx.session.user.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    });

    return { orgId, slug };
  }),

  listMembers: protectedProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const viewer = await ctx.db.query.orgMembers.findFirst({
        where: (m, { and, eq, isNull }) =>
          and(
            eq(m.orgId, input.orgId),
            eq(m.userId, ctx.session.user.id),
            isNull(m.deletedAt)
          ),
      });

      if (!viewer) throw new Error("Forbidden");

      return ctx.db.query.orgMembers.findMany({
        where: (m, { and, eq, isNull }) =>
          and(eq(m.orgId, input.orgId), isNull(m.deletedAt)),
        with: {
          user: true,
        },
      });
    }),
});
