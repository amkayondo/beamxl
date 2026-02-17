import { z } from "zod";

import {
  createTRPCRouter,
  orgProcedure,
} from "@/server/api/trpc";
import {
  listConversationMessages,
  listConversations,
  sendConversationMessage,
} from "@/server/services/conversation.service";

export const conversationsRouter = createTRPCRouter({
  list: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        status: z.enum(["OPEN", "PENDING", "CLOSED"]).optional(),
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
      const items = await listConversationMessages(input);
      return {
        items,
        total: items.length,
      };
    }),
});
