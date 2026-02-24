import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { createStarterFlow } from "@/lib/flows/starter-flow";
import { adminProcedure, createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import { flows } from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";

const WORKFLOW_TEMPLATES = [
  { key: "GENTLE_REMINDER", name: "Gentle Reminder", channels: ["EMAIL", "SMS"] },
  { key: "STANDARD_FOLLOWUP", name: "Standard Follow-up", channels: ["EMAIL", "SMS", "VOICE"] },
  { key: "AGGRESSIVE_RECOVERY", name: "Aggressive Recovery", channels: ["SMS", "VOICE"] },
  { key: "LARGE_INVOICE_VIP", name: "Large Invoice VIP", channels: ["EMAIL", "SMS", "VOICE"] },
  { key: "REPEAT_LATE_PAYER", name: "Repeat Late Payer", channels: ["SMS"] },
  { key: "FINAL_NOTICE", name: "Final Notice", channels: ["EMAIL", "SMS"] },
  { key: "PAYMENT_CONFIRMATION", name: "Payment Confirmation", channels: ["EMAIL", "SMS", "WHATSAPP"] },
  { key: "EARLY_PAYMENT_INCENTIVE", name: "Early Payment Incentive", channels: ["EMAIL", "SMS", "WHATSAPP"] },
  { key: "PAYMENT_PLAN", name: "Payment Plan", channels: ["SMS", "WHATSAPP", "EMAIL"] },
  { key: "DISPUTE_RESOLUTION", name: "Dispute Resolution", channels: ["EMAIL", "SMS", "WHATSAPP"] },
] as const;

export const workflowTemplatesRouter = createTRPCRouter({
  list: orgProcedure
    .input(z.object({ orgId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const existingFlows = await ctx.db.query.flows.findMany({
        where: (f, { and, eq, isNull }) =>
          and(eq(f.orgId, input.orgId), isNull(f.deletedAt)),
      });

      const existingByName = new Set(existingFlows.map((flow) => flow.name.toLowerCase()));
      return WORKFLOW_TEMPLATES.map((template) => ({
        ...template,
        existsInOrg: existingByName.has(template.name.toLowerCase()),
      }));
    }),

  createFromTemplate: adminProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        templateKey: z.enum(
          WORKFLOW_TEMPLATES.map((template) => template.key) as [string, ...string[]],
        ),
        name: z.string().min(2).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = WORKFLOW_TEMPLATES.find((item) => item.key === input.templateKey);
      if (!template) {
        throw new Error("Template not found");
      }

      const flowId = crypto.randomUUID();
      const flow = createStarterFlow({
        orgSlug: "",
        flowId,
        name: input.name ?? template.name,
        updatedBy: ctx.session.user.name ?? ctx.session.user.email ?? "Unknown",
      });

      await ctx.db.insert(flows).values({
        id: flowId,
        orgId: input.orgId,
        name: flow.name,
        status: "DRAFT",
        nodesJson: flow.nodes,
        edgesJson: flow.edges,
        viewportJson: flow.viewport,
        updatedByUserId: ctx.session.user.id,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "FLOW_TEMPLATE_APPLIED",
        entityType: "Flow",
        entityId: flowId,
        after: {
          templateKey: template.key,
          templateName: template.name,
        },
      });

      return { flowId };
    }),
});
