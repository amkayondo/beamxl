import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { adminProcedure, createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { ownerCommands } from "@/server/db/schema";

function inferIntent(commandText: string) {
  const normalized = commandText.toLowerCase();
  if (normalized.includes("overdue")) return "CHASE_OVERDUE";
  if (normalized.includes("pause")) return "PAUSE_REMINDERS";
  if (normalized.includes("write off") || normalized.includes("write-off")) return "WRITE_OFF_INVOICE";
  if (normalized.includes("stop") && normalized.includes("voice")) return "STOP_VOICE";
  if (normalized.includes("who owes")) return "TOP_DEBTORS";
  return "GENERAL";
}

export const commandsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: z.enum(["RECEIVED", "CONFIRMED", "EXECUTED", "REJECTED", "FAILED"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.query.ownerCommands.findMany({
        where: (c, { and, eq }) =>
          and(eq(c.orgId, input.orgId), input.status ? eq(c.status, input.status) : undefined),
        orderBy: (c, { desc }) => [desc(c.createdAt)],
        limit: input.limit,
      });
    }),

  create: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        channel: z.enum(["WHATSAPP", "VOICE", "EMAIL", "SMS"]).default("WHATSAPP"),
        commandText: z.string().min(2),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = crypto.randomUUID();
      await ctx.db.insert(ownerCommands).values({
        id,
        orgId: input.orgId,
        userId: ctx.session.user.id,
        channel: input.channel,
        commandText: input.commandText,
        parsedIntent: inferIntent(input.commandText),
        status: "RECEIVED",
        metadata: input.metadata ?? {},
      });

      return { commandId: id };
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        commandId: z.string().min(1),
        status: z.enum(["CONFIRMED", "EXECUTED", "REJECTED", "FAILED"]),
        responseText: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(ownerCommands)
        .set({
          status: input.status,
          responseText: input.responseText ?? null,
          updatedAt: new Date(),
        })
        .where(and(eq(ownerCommands.orgId, input.orgId), eq(ownerCommands.id, input.commandId)));

      return { ok: true };
    }),
});
