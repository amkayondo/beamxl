import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { assertRole, type OrgRole } from "@/lib/rbac";
import { auth } from "@/server/better-auth";
import { db } from "@/server/db";

export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth.api.getSession({
    headers: opts.headers,
  });

  return {
    db,
    session,
    ...opts,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  const result = await next();

  if (t._config.isDev) {
    const end = Date.now();
    console.log(`[TRPC] ${path} took ${end - start}ms`);
  }

  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

const orgIdInputSchema = z.object({ orgId: z.string().min(1) });

export const orgProcedure = protectedProcedure.use(async ({ ctx, input, next }) => {
  const parsed = orgIdInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "orgId is required",
    });
  }

  const membership = await ctx.db.query.orgMembers.findFirst({
    where: (m, { and, eq, isNull }) =>
      and(
        eq(m.orgId, parsed.data.orgId),
        eq(m.userId, ctx.session.user.id),
        isNull(m.deletedAt)
      ),
  });

  if (!membership || membership.status !== "ACTIVE") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Invalid organization access" });
  }

  return next({
    ctx: {
      ...ctx,
      orgId: parsed.data.orgId,
      orgRole: membership.role as OrgRole,
      orgMembershipId: membership.id,
    },
  });
});

export const adminProcedure = orgProcedure.use(({ ctx, next }) => {
  assertRole(ctx.orgRole, "ADMIN");
  return next();
});

export const ownerProcedure = orgProcedure.use(({ ctx, next }) => {
  assertRole(ctx.orgRole, "OWNER");
  return next();
});
