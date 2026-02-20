import { and, eq } from "drizzle-orm";
import { z } from "zod";

import {
  createTRPCRouter,
  adminProcedure,
  orgProcedure,
} from "@/server/api/trpc";
import { conversations } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import {
  listConversationTimeline,
  listConversations,
  sendConversationMessage,
} from "@/server/services/conversation.service";

export const conversationsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: z.enum(["OPEN", "PENDING", "CLOSED"]).optional(),
        channel: z.enum(["WHATSAPP", "SMS", "EMAIL", "VOICE"]).optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      return listConversations(input);
    }),

  sendMessage: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        invoiceId: z.string().optional(),
        body: z.string().min(1),
        channel: z.enum(["WHATSAPP", "EMAIL", "SMS"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return sendConversationMessage(input);
    }),

  thread: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const items = await listConversationTimeline(input);
      return {
        items,
        total: items.length,
      };
    }),

  assign: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1),
        assignedToUserId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conversation = await ctx.db.query.conversations.findFirst({
        where: (c, { and, eq }) =>
          and(
            eq(c.orgId, input.orgId),
            eq(c.contactId, input.contactId),
            eq(c.channel, "WHATSAPP")
          ),
      });

      if (!conversation) {
        throw new Error("Conversation not found");
      }

      await ctx.db
        .update(conversations)
        .set({
          assignedToUserId: input.assignedToUserId,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(conversations.id, conversation.id)
          )
        );

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "CONVERSATION_ASSIGNED",
        entityType: "Conversation",
        entityId: conversation.id,
        before: { assignedToUserId: conversation.assignedToUserId },
        after: { assignedToUserId: input.assignedToUserId },
      });

      return { ok: true };
    }),
});
