import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { tags } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";

export const tagsRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.tags.findMany({
        where: (t, { and, eq, isNull }) =>
          and(eq(t.orgId, input.orgId), isNull(t.deletedAt)),
        orderBy: (t, { asc }) => [asc(t.name)],
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        name: z.string().min(1),
        color: z.string().default("slate"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tagId = crypto.randomUUID();

      await ctx.db.insert(tags).values({
        id: tagId,
        orgId: input.orgId,
        name: input.name,
        color: input.color,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "TAG_CREATED",
        entityType: "Tag",
        entityId: tagId,
        after: { name: input.name, color: input.color },
      });

      return { id: tagId };
    }),

  update: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        tagId: z.string().min(1),
        name: z.string().min(1).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tags)
        .set({
          name: input.name,
          color: input.color,
          updatedAt: new Date(),
        })
        .where(and(eq(tags.id, input.tagId), eq(tags.orgId, input.orgId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "TAG_UPDATED",
        entityType: "Tag",
        entityId: input.tagId,
        after: { name: input.name, color: input.color },
      });

      return { ok: true };
    }),

  delete: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        tagId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(tags)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tags.id, input.tagId), eq(tags.orgId, input.orgId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "TAG_DELETED",
        entityType: "Tag",
        entityId: input.tagId,
      });

      return { ok: true };
    }),
});
