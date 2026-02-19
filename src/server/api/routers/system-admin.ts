import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { z } from "zod";

import { createTRPCRouter, superAdminProcedure } from "@/server/api/trpc";
import {
  user,
  orgs,
  contacts,
  invoices,
  payments,
  auditLogs,
  webhookEvents,
} from "@/server/db/schema";
import { TRPCError } from "@trpc/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const paginationInput = {
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
};

function paginated<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const systemAdminRouter = createTRPCRouter({
  // =========================================================================
  // Dashboard
  // =========================================================================

  overview: superAdminProcedure.query(async ({ ctx }) => {
    const [
      totalOrgsRows,
      totalUsersRows,
      totalContactsRows,
      totalInvoicesRows,
      totalPaymentsRows,
      recentOrgs,
      recentUsers,
    ] = await Promise.all([
      ctx.db.select({ count: sql<number>`count(*)` }).from(orgs),
      ctx.db.select({ count: sql<number>`count(*)` }).from(user),
      ctx.db.select({ count: sql<number>`count(*)` }).from(contacts),
      ctx.db.select({ count: sql<number>`count(*)` }).from(invoices),
      ctx.db.select({ count: sql<number>`count(*)` }).from(payments),
      ctx.db.query.orgs.findMany({
        orderBy: (o: any, { desc }: any) => [desc(o.createdAt)],
        limit: 5,
      }),
      ctx.db.query.user.findMany({
        orderBy: (u: any, { desc }: any) => [desc(u.createdAt)],
        limit: 5,
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          systemRole: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      totalOrgs: Number(totalOrgsRows[0]?.count ?? 0),
      totalUsers: Number(totalUsersRows[0]?.count ?? 0),
      totalContacts: Number(totalContactsRows[0]?.count ?? 0),
      totalInvoices: Number(totalInvoicesRows[0]?.count ?? 0),
      totalPayments: Number(totalPaymentsRows[0]?.count ?? 0),
      recentOrgs,
      recentUsers,
    };
  }),

  // =========================================================================
  // Org Management
  // =========================================================================

  listOrgs: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        ...paginationInput,
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const searchCondition = input.search
        ? or(
            like(orgs.name, `%${input.search}%`),
            like(orgs.slug, `%${input.search}%`)
          )
        : undefined;

      const [items, countRows] = await Promise.all([
        ctx.db
          .select({
            id: orgs.id,
            slug: orgs.slug,
            name: orgs.name,
            defaultCurrency: orgs.defaultCurrency,
            timezone: orgs.timezone,
            createdByUserId: orgs.createdByUserId,
            createdAt: orgs.createdAt,
            updatedAt: orgs.updatedAt,
            deletedAt: orgs.deletedAt,
            memberCount: sql<number>`(
              SELECT count(*) FROM beamflow_org_members
              WHERE beamflow_org_members.org_id = ${orgs.id}
              AND beamflow_org_members.deleted_at IS NULL
            )`,
          })
          .from(orgs)
          .where(searchCondition)
          .orderBy(desc(orgs.createdAt))
          .offset(offset)
          .limit(input.limit),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(orgs)
          .where(searchCondition),
      ]);

      return paginated(
        items.map((i) => ({ ...i, memberCount: Number(i.memberCount) })),
        Number(countRows[0]?.count ?? 0),
        input.page,
        input.limit
      );
    }),

  getOrg: superAdminProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const org = await ctx.db.query.orgs.findFirst({
        where: (o: any, { eq }: any) => eq(o.id, input.orgId),
        with: {
          members: {
            with: {
              user: {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
      });

      if (!org) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      const [contactsCount, invoicesCount, paymentsCount] = await Promise.all([
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(contacts)
          .where(eq(contacts.orgId, input.orgId)),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(invoices)
          .where(eq(invoices.orgId, input.orgId)),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(payments)
          .where(eq(payments.orgId, input.orgId)),
      ]);

      return {
        ...org,
        stats: {
          contacts: Number(contactsCount[0]?.count ?? 0),
          invoices: Number(invoicesCount[0]?.count ?? 0),
          payments: Number(paymentsCount[0]?.count ?? 0),
        },
      };
    }),

  suspendOrg: superAdminProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(orgs)
        .set({ deletedAt: new Date() })
        .where(eq(orgs.id, input.orgId))
        .returning({ id: orgs.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      return { success: true };
    }),

  unsuspendOrg: superAdminProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(orgs)
        .set({ deletedAt: null })
        .where(eq(orgs.id, input.orgId))
        .returning({ id: orgs.id });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      return { success: true };
    }),

  deleteOrg: superAdminProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(orgs)
        .where(eq(orgs.id, input.orgId))
        .returning({ id: orgs.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found" });
      }

      return { success: true };
    }),

  // =========================================================================
  // User Management
  // =========================================================================

  listUsers: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        role: z.enum(["USER", "ADMIN"]).optional(),
        ...paginationInput,
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const conditions = and(
        input.search
          ? or(
              like(user.name, `%${input.search}%`),
              like(user.email, `%${input.search}%`)
            )
          : undefined,
        input.role ? eq(user.systemRole, input.role) : undefined
      );

      const [items, countRows] = await Promise.all([
        ctx.db
          .select({
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified,
            systemRole: user.systemRole,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })
          .from(user)
          .where(conditions)
          .orderBy(desc(user.createdAt))
          .offset(offset)
          .limit(input.limit),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(user)
          .where(conditions),
      ]);

      return paginated(items, Number(countRows[0]?.count ?? 0), input.page, input.limit);
    }),

  getUser: superAdminProcedure
    .input(z.object({ userId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const dbUser = await ctx.db.query.user.findFirst({
        where: (u: any, { eq }: any) => eq(u.id, input.userId),
        columns: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
          systemRole: true,
          createdAt: true,
          updatedAt: true,
        },
        with: {
          orgMemberships: {
            with: {
              org: {
                columns: {
                  id: true,
                  slug: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!dbUser) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return dbUser;
    }),

  setSystemRole: superAdminProcedure
    .input(
      z.object({
        userId: z.string().min(1),
        role: z.enum(["USER", "ADMIN"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change your own system role",
        });
      }

      const [updated] = await ctx.db
        .update(user)
        .set({ systemRole: input.role, updatedAt: new Date() })
        .where(eq(user.id, input.userId))
        .returning({ id: user.id, systemRole: user.systemRole });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      return updated;
    }),

  // =========================================================================
  // Audit Logs
  // =========================================================================

  listAuditLogs: superAdminProcedure
    .input(
      z.object({
        orgId: z.string().optional(),
        action: z.string().optional(),
        entityType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        ...paginationInput,
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const conditions = and(
        input.orgId ? eq(auditLogs.orgId, input.orgId) : undefined,
        input.action ? eq(auditLogs.action, input.action) : undefined,
        input.entityType ? eq(auditLogs.entityType, input.entityType) : undefined,
        input.startDate
          ? gte(auditLogs.createdAt, new Date(input.startDate))
          : undefined,
        input.endDate
          ? lte(auditLogs.createdAt, new Date(input.endDate))
          : undefined
      );

      const [items, countRows] = await Promise.all([
        ctx.db
          .select({
            id: auditLogs.id,
            orgId: auditLogs.orgId,
            actorType: auditLogs.actorType,
            actorUserId: auditLogs.actorUserId,
            actorName: user.name,
            action: auditLogs.action,
            entityType: auditLogs.entityType,
            entityId: auditLogs.entityId,
            correlationId: auditLogs.correlationId,
            before: auditLogs.before,
            after: auditLogs.after,
            ipHash: auditLogs.ipHash,
            userAgentHash: auditLogs.userAgentHash,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .leftJoin(user, eq(auditLogs.actorUserId, user.id))
          .where(conditions)
          .orderBy(desc(auditLogs.createdAt))
          .offset(offset)
          .limit(input.limit),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(conditions),
      ]);

      return paginated(items, Number(countRows[0]?.count ?? 0), input.page, input.limit);
    }),

  // =========================================================================
  // Webhook Events
  // =========================================================================

  listWebhookEvents: superAdminProcedure
    .input(
      z.object({
        provider: z.string().optional(),
        status: z.enum(["RECEIVED", "PROCESSED", "FAILED"]).optional(),
        orgId: z.string().optional(),
        ...paginationInput,
      })
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const conditions = and(
        input.provider ? eq(webhookEvents.provider, input.provider) : undefined,
        input.status ? eq(webhookEvents.status, input.status) : undefined,
        input.orgId ? eq(webhookEvents.orgId, input.orgId) : undefined
      );

      const [items, countRows] = await Promise.all([
        ctx.db
          .select()
          .from(webhookEvents)
          .where(conditions)
          .orderBy(desc(webhookEvents.receivedAt))
          .offset(offset)
          .limit(input.limit),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(webhookEvents)
          .where(conditions),
      ]);

      return paginated(items, Number(countRows[0]?.count ?? 0), input.page, input.limit);
    }),

  // =========================================================================
  // Job Queues
  // =========================================================================

  getQueueStats: superAdminProcedure.query(async () => {
    const { queueNames, redisConnection } = await import("@/server/jobs/queues");
    const { Queue } = await import("bullmq");

    const entries = Object.entries(queueNames) as [string, string][];
    const stats = await Promise.all(
      entries.map(async ([key, name]) => {
        const queue = new Queue(name, { connection: redisConnection });
        try {
          const counts = await queue.getJobCounts(
            "waiting",
            "active",
            "completed",
            "failed",
            "delayed"
          );
          return {
            name,
            waiting: counts.waiting ?? 0,
            active: counts.active ?? 0,
            completed: counts.completed ?? 0,
            failed: counts.failed ?? 0,
            delayed: counts.delayed ?? 0,
          };
        } finally {
          await queue.close();
        }
      })
    );

    return stats;
  }),

  getQueueJobs: superAdminProcedure
    .input(
      z.object({
        queueName: z.string().min(1),
        status: z.enum(["waiting", "active", "completed", "failed", "delayed"]),
        ...paginationInput,
      })
    )
    .query(async ({ input }) => {
      const { redisConnection } = await import("@/server/jobs/queues");
      const { Queue } = await import("bullmq");

      const queue = new Queue(input.queueName, { connection: redisConnection });
      try {
        const start = (input.page - 1) * input.limit;
        const end = start + input.limit - 1;

        const [jobs, counts] = await Promise.all([
          queue.getJobs([input.status], start, end),
          queue.getJobCounts(input.status),
        ]);

        const total = counts[input.status] ?? 0;

        const items = jobs.map((job) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          opts: job.opts,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
        }));

        return paginated(items, total, input.page, input.limit);
      } finally {
        await queue.close();
      }
    }),

  retryJob: superAdminProcedure
    .input(
      z.object({
        queueName: z.string().min(1),
        jobId: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const { redisConnection } = await import("@/server/jobs/queues");
      const { Queue } = await import("bullmq");

      const queue = new Queue(input.queueName, { connection: redisConnection });
      try {
        const job = await queue.getJob(input.jobId);
        if (!job) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
        }

        const state = await job.getState();
        if (state !== "failed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Job is not in failed state (current: ${state})`,
          });
        }

        await job.retry(state);
        return { success: true };
      } finally {
        await queue.close();
      }
    }),
});
