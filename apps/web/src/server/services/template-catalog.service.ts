import { db } from "@/server/db";
import { messageTemplates } from "@/server/db/schema";

type MvpTemplateDefinition = {
  key: string;
  channel: "EMAIL" | "SMS";
  subject?: string;
  htmlBody?: string;
  body: string;
};

const MVP_TEMPLATE_DEFINITIONS: MvpTemplateDefinition[] = [
  {
    key: "FRIENDLY_REMINDER",
    channel: "EMAIL",
    subject: "Friendly reminder: invoice {{amount}} due {{dueDate}}",
    htmlBody:
      "<p>Hi {{name}},</p><p>This is a friendly reminder that <strong>{{amount}}</strong> for {{period}} is due on <strong>{{dueDate}}</strong>.</p><p><a href=\"{{payLink}}\">Pay now</a>.</p>",
    body: "Hi {{name}}, this is a reminder that {{amount}} for {{period}} is due on {{dueDate}}. Pay here: {{payLink}}",
  },
  {
    key: "DUE_TODAY",
    channel: "EMAIL",
    subject: "Invoice due today: {{amount}}",
    htmlBody:
      "<p>Hi {{name}},</p><p>Your invoice for <strong>{{amount}}</strong> is due today.</p><p><a href=\"{{payLink}}\">Complete payment</a>.</p>",
    body: "Hi {{name}}, your invoice for {{amount}} is due today. Pay here: {{payLink}}",
  },
  {
    key: "LATE_NOTICE",
    channel: "EMAIL",
    subject: "Past due notice: {{amount}}",
    htmlBody:
      "<p>Hi {{name}},</p><p>Your invoice for <strong>{{amount}}</strong> is past due. Please pay as soon as possible.</p><p><a href=\"{{payLink}}\">Pay invoice</a>.</p>",
    body: "Hi {{name}}, your invoice for {{amount}} is now overdue. Please pay here: {{payLink}}",
  },
  {
    key: "FINAL_NOTICE",
    channel: "EMAIL",
    subject: "Final reminder: {{amount}} outstanding",
    htmlBody:
      "<p>Hi {{name}},</p><p>This is your final reminder for <strong>{{amount}}</strong>.</p><p><a href=\"{{payLink}}\">Pay now</a>.</p>",
    body: "Hi {{name}}, final reminder for {{amount}}. Pay now: {{payLink}}",
  },
  {
    key: "RECEIPT_CONFIRMATION",
    channel: "EMAIL",
    subject: "Payment received",
    htmlBody: "<p>Hi {{name}},</p><p>We received your payment of <strong>{{amount}}</strong>. Thank you.</p>",
    body: "Hi {{name}}, we received your payment of {{amount}}. Thank you.",
  },
];

export async function ensureMvpTemplatesForOrg(orgId: string) {
  const keys = [...new Set(MVP_TEMPLATE_DEFINITIONS.map((t) => t.key))];

  const existing = await db.query.messageTemplates.findMany({
    where: (t, { and, eq, inArray }) =>
      and(
        eq(t.orgId, orgId),
        eq(t.language, "EN"),
        inArray(t.key, keys),
      ),
  });

  const existingKeyChannel = new Set(existing.map((tpl) => `${tpl.key}:${tpl.channel ?? "ANY"}`));

  const missing = MVP_TEMPLATE_DEFINITIONS.filter(
    (definition) => !existingKeyChannel.has(`${definition.key}:${definition.channel}`),
  );

  if (missing.length === 0) {
    return { inserted: 0 };
  }

  await db.insert(messageTemplates).values(
    missing.map((definition) => ({
      id: crypto.randomUUID(),
      orgId,
      key: definition.key,
      language: "EN" as const,
      version: 1,
      body: definition.body,
      subject: definition.subject ?? null,
      htmlBody: definition.htmlBody ?? null,
      channel: definition.channel,
      approvalStatus: "APPROVED" as const,
      complianceLocked: false,
      isActive: true,
      approvedAt: new Date(),
    })),
  );

  return { inserted: missing.length };
}
