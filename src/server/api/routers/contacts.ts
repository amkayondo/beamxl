import { and, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import {
  adminProcedure,
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import { contactTags, contacts } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";

const listInput = z.object({
  orgId: z.string().min(1),
  query: z.string().optional(),
  tagIds: z.array(z.string()).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const contactsRouter = createTRPCRouter({
  list: orgProcedure.input(listInput).query(async ({ ctx, input }) => {
    const offset = (input.page - 1) * input.pageSize;

    const whereClause = and(
      eq(contacts.orgId, input.orgId),
      isNull(contacts.deletedAt),
      input.query ? ilike(contacts.name, `%${input.query}%`) : undefined
    );

    const [items, countRows] = await Promise.all([
      ctx.db.query.contacts.findMany({
        where: whereClause,
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        offset,
        limit: input.pageSize,
      }),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(whereClause),
    ]);

    return {
      items,
      total: Number(countRows[0]?.count ?? 0),
    };
  }),

  create: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        name: z.string().min(2),
        phoneE164: z.string().min(7),
        language: z.enum(["EN", "RW", "LG"]).default("EN"),
        tagIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const contactId = crypto.randomUUID();

      await ctx.db.insert(contacts).values({
        id: contactId,
        orgId: input.orgId,
        name: input.name,
        phoneE164: input.phoneE164,
        language: input.language,
      });

      if (input.tagIds?.length) {
        await ctx.db.insert(contactTags).values(
          input.tagIds.map((tagId) => ({
            contactId,
            tagId,
            orgId: input.orgId,
          }))
        );
      }

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "CONTACT_CREATED",
        entityType: "Contact",
        entityId: contactId,
        after: {
          name: input.name,
          phoneE164: input.phoneE164,
        },
      });

      return { contactId };
    }),

  update: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        name: z.string().min(2).optional(),
        phoneE164: z.string().min(7).optional(),
        language: z.enum(["EN", "RW", "LG"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(contacts)
        .set({
          name: input.name,
          phoneE164: input.phoneE164,
          language: input.language,
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, input.contactId), eq(contacts.orgId, input.orgId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "CONTACT_UPDATED",
        entityType: "Contact",
        entityId: input.contactId,
        after: input,
      });

      return { ok: true };
    }),

  archive: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(contacts)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(eq(contacts.id, input.contactId), eq(contacts.orgId, input.orgId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "CONTACT_ARCHIVED",
        entityType: "Contact",
        entityId: input.contactId,
      });

      return { ok: true };
    }),

  byId: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.contacts.findFirst({
        where: (c, { and, eq }) =>
          and(eq(c.orgId, input.orgId), eq(c.id, input.contactId)),
      });
    }),
});
