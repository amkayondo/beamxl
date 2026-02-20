import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import { z } from "zod";

import { assertRole } from "@/lib/rbac";
import { createTRPCRouter, orgProcedure } from "@/server/api/trpc";
import {
  contacts,
  extensionCaptureEvents,
  extensionInstallations,
} from "@/server/db/schema";
import { writeAuditLog } from "@/server/services/audit.service";
import { sendConversationMessage } from "@/server/services/conversation.service";
import { createManualInvoice } from "@/server/services/invoice.service";
import { toCanonicalInvoiceStatus } from "@/server/services/invoice-status.service";

const extensionWriteProcedure = orgProcedure.use(({ ctx, next }) => {
  assertRole(ctx.orgRole, "MEMBER");
  return next();
});

const extensionCaptureDraftSchema = z.object({
  clientName: z.string().min(1).optional(),
  clientEmail: z.string().email().optional(),
  clientPhoneE164: z.string().min(7).optional(),
  invoiceNumber: z.string().min(1).optional(),
  amountDueMinor: z.number().int().positive().optional(),
  currency: z.string().length(3).default("USD"),
  dueDate: z.string().datetime().optional(),
  periodStart: z.string().date().optional(),
  periodEnd: z.string().date().optional(),
  notes: z.string().max(2_000).optional(),
});

type ExtensionCaptureDraft = z.infer<typeof extensionCaptureDraftSchema>;

const extensionConflictResolutionSchema = z.object({
  mode: z.enum(["EXISTING_CONTACT", "CREATE_CONTACT"]),
  existingContactId: z.string().min(1).optional(),
  newContact: z
    .object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phoneE164: z.string().min(7),
      timezone: z.string().optional(),
    })
    .optional(),
});

function buildInstallKey(input: {
  orgId: string;
  userId: string;
  installationId: string;
  browser: "CHROME" | "EDGE" | "BRAVE" | "ARC" | "OPERA" | "OTHER";
  extensionVersion: string;
  metadata?: Record<string, unknown>;
}) {
  return {
    orgId: input.orgId,
    userId: input.userId,
    installationId: input.installationId,
    browser: input.browser,
    extensionVersion: input.extensionVersion,
    metadata: input.metadata ?? {},
    status: "ACTIVE" as const,
    lastSeenAt: new Date(),
    updatedAt: new Date(),
  };
}

function deriveInvoiceWindow(draft: ExtensionCaptureDraft) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const defaultDueAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  return {
    periodStart: draft.periodStart ?? today,
    periodEnd: draft.periodEnd ?? today,
    dueDate: draft.dueDate ?? defaultDueAt,
  };
}

export const extensionRouter = createTRPCRouter({
  createCaptureDraft: extensionWriteProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        sourceType: z.enum(["GMAIL", "WEBPAGE", "MANUAL"]),
        sourceUrl: z.string().url().optional(),
        rawPayload: z.record(z.string(), z.unknown()).default({}),
        draft: extensionCaptureDraftSchema.default({}),
        installation: z
          .object({
            installationId: z.string().min(1),
            browser: z.enum(["CHROME", "EDGE", "BRAVE", "ARC", "OPERA", "OTHER"]),
            extensionVersion: z.string().min(1),
            metadata: z.record(z.string(), z.unknown()).optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const installation = input.installation;
      const installationPk = installation
        ? await (async () => {
            const existing = await ctx.db.query.extensionInstallations.findFirst({
              where: (i, { and, eq }) =>
                and(eq(i.orgId, input.orgId), eq(i.installationId, installation.installationId)),
            });

            if (existing) {
              await ctx.db
                .update(extensionInstallations)
                .set({
                  ...buildInstallKey({
                    orgId: input.orgId,
                    userId: ctx.session.user.id,
                    installationId: installation.installationId,
                    browser: installation.browser,
                    extensionVersion: installation.extensionVersion,
                    metadata: installation.metadata,
                  }),
                })
                .where(eq(extensionInstallations.id, existing.id));
              return existing.id;
            }

            const id = crypto.randomUUID();
            await ctx.db.insert(extensionInstallations).values({
              id,
              ...buildInstallKey({
                orgId: input.orgId,
                userId: ctx.session.user.id,
                installationId: installation.installationId,
                browser: installation.browser,
                extensionVersion: installation.extensionVersion,
                metadata: installation.metadata,
              }),
            });
            return id;
          })()
        : null;

      const captureEventId = crypto.randomUUID();
      await ctx.db.insert(extensionCaptureEvents).values({
        id: captureEventId,
        orgId: input.orgId,
        userId: ctx.session.user.id,
        installationId: installationPk,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        rawPayload: input.rawPayload,
        normalizedDraft: input.draft,
        status: "DRAFT",
      });

      return {
        captureEventId,
        draft: input.draft,
      };
    }),

  resolveContactConflicts: extensionWriteProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        captureEventId: z.string().min(1),
        draft: extensionCaptureDraftSchema.optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const capture = await ctx.db.query.extensionCaptureEvents.findFirst({
        where: (e, { and, eq }) =>
          and(eq(e.orgId, input.orgId), eq(e.id, input.captureEventId)),
      });

      if (!capture) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Capture draft not found" });
      }

      const draft = (input.draft ?? capture.normalizedDraft ?? {}) as ExtensionCaptureDraft;
      let matches: Array<typeof contacts.$inferSelect> = [];
      if (draft.clientEmail) {
        matches = await ctx.db.query.contacts.findMany({
          where: (c, { and, eq, isNull }) =>
            and(eq(c.orgId, input.orgId), isNull(c.deletedAt), eq(c.email, draft.clientEmail!)),
          limit: 10,
          orderBy: (c, { desc }) => [desc(c.updatedAt)],
        });
      } else if (draft.clientPhoneE164) {
        matches = await ctx.db.query.contacts.findMany({
          where: (c, { and, eq, isNull }) =>
            and(
              eq(c.orgId, input.orgId),
              isNull(c.deletedAt),
              eq(c.phoneE164, draft.clientPhoneE164!),
            ),
          limit: 10,
          orderBy: (c, { desc }) => [desc(c.updatedAt)],
        });
      } else if (draft.clientName) {
        matches = await ctx.db.query.contacts.findMany({
          where: (c, { and, eq, isNull }) =>
            and(
              eq(c.orgId, input.orgId),
              isNull(c.deletedAt),
              ilike(c.name, `%${draft.clientName}%`),
            ),
          limit: 10,
          orderBy: (c, { desc }) => [desc(c.updatedAt)],
        });
      }

      const preferredMatch = matches.find((m) => draft.clientEmail && m.email === draft.clientEmail)
        ?? matches.find((m) => draft.clientPhoneE164 && m.phoneE164 === draft.clientPhoneE164)
        ?? matches[0]
        ?? null;

      await ctx.db
        .update(extensionCaptureEvents)
        .set({
          resolution: {
            matches: matches.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phoneE164 })),
            preferredMatchId: preferredMatch?.id ?? null,
          },
          status: "RESOLVED",
          updatedAt: new Date(),
        })
        .where(and(eq(extensionCaptureEvents.orgId, input.orgId), eq(extensionCaptureEvents.id, input.captureEventId)));

      return {
        matches,
        preferredMatchId: preferredMatch?.id ?? null,
      };
    }),

  createInvoiceFromCapture: extensionWriteProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        captureEventId: z.string().min(1),
        resolution: extensionConflictResolutionSchema,
        draftOverride: extensionCaptureDraftSchema.partial().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const capture = await ctx.db.query.extensionCaptureEvents.findFirst({
        where: (e, { and, eq }) =>
          and(eq(e.orgId, input.orgId), eq(e.id, input.captureEventId)),
      });

      if (!capture) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Capture draft not found" });
      }

      const draft = {
        ...((capture.normalizedDraft ?? {}) as ExtensionCaptureDraft),
        ...(input.draftOverride ?? {}),
      };

      const invoiceWindow = deriveInvoiceWindow(draft);
      const amountDueMinor = draft.amountDueMinor ?? 0;
      if (amountDueMinor <= 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "amountDueMinor must be provided for extension invoice creation",
        });
      }

      let contactId: string;
      if (input.resolution.mode === "EXISTING_CONTACT") {
        if (!input.resolution.existingContactId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "existingContactId is required for EXISTING_CONTACT resolution",
          });
        }

        const existing = await ctx.db.query.contacts.findFirst({
          where: (c, { and, eq, isNull }) =>
            and(
              eq(c.orgId, input.orgId),
              eq(c.id, input.resolution.existingContactId),
              isNull(c.deletedAt),
            ),
        });
        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Selected contact not found" });
        }
        contactId = existing.id;
      } else {
        const nextContact = input.resolution.newContact;
        if (!nextContact) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "newContact payload is required for CREATE_CONTACT resolution",
          });
        }

        const createdId = crypto.randomUUID();
        await ctx.db.insert(contacts).values({
          id: createdId,
          orgId: input.orgId,
          name: nextContact.name,
          email: nextContact.email ?? null,
          phoneE164: nextContact.phoneE164,
          timezone: nextContact.timezone ?? "America/New_York",
          language: "EN",
        });
        contactId = createdId;
      }

      if (draft.invoiceNumber) {
        const duplicate = await ctx.db.query.invoices.findFirst({
          where: (i, { and, eq, isNull }) =>
            and(eq(i.orgId, input.orgId), eq(i.invoiceNumber, draft.invoiceNumber!), isNull(i.deletedAt)),
        });

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "An invoice with this invoice number already exists",
          });
        }
      }

      const created = await createManualInvoice({
        orgId: input.orgId,
        contactId,
        invoiceNumber: draft.invoiceNumber ?? null,
        periodStart: invoiceWindow.periodStart,
        periodEnd: invoiceWindow.periodEnd,
        dueDate: new Date(invoiceWindow.dueDate),
        amountDueMinor,
        currency: (draft.currency ?? "USD").toUpperCase(),
        status: "SENT",
      });

      await ctx.db
        .update(extensionCaptureEvents)
        .set({
          resolution: {
            ...(capture.resolution ?? {}),
            finalResolution: input.resolution,
          },
          status: "APPLIED",
          appliedInvoiceId: created.invoiceId,
          updatedAt: new Date(),
        })
        .where(and(eq(extensionCaptureEvents.orgId, input.orgId), eq(extensionCaptureEvents.id, input.captureEventId)));

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "EXTENSION_INVOICE_CREATED",
        entityType: "Invoice",
        entityId: created.invoiceId,
        after: { captureEventId: input.captureEventId, resolution: input.resolution },
      });

      return {
        invoiceId: created.invoiceId,
      };
    }),

  sendPaymentLinkFromExtension: extensionWriteProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        invoiceId: z.string().min(1),
        channel: z.enum(["EMAIL", "SMS", "WHATSAPP"]).default("EMAIL"),
        body: z.string().max(2_000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const invoice = await ctx.db.query.invoices.findFirst({
        where: (i, { and, eq, isNull }) =>
          and(eq(i.orgId, input.orgId), eq(i.id, input.invoiceId), isNull(i.deletedAt)),
        with: {
          contact: true,
        },
      });

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }

      if (!invoice.payLinkUrl) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice has no payment link" });
      }

      const defaultBody = `Hi ${invoice.contact.name}, you can pay invoice ${invoice.invoiceNumber} here: ${invoice.payLinkUrl}`;
      const message = input.body?.trim() || defaultBody;
      const response = await sendConversationMessage({
        orgId: input.orgId,
        contactId: invoice.contactId,
        invoiceId: invoice.id,
        body: message,
        channel: input.channel,
        emailSubject: `Payment link for invoice ${invoice.invoiceNumber}`,
        emailHtml: `<p>${message}</p>`,
      });

      await writeAuditLog({
        orgId: input.orgId,
        actorType: "USER",
        actorUserId: ctx.session.user.id,
        action: "EXTENSION_PAYMENT_LINK_SENT",
        entityType: "Invoice",
        entityId: invoice.id,
        after: { channel: input.channel, messageLogId: response.messageLogId },
      });

      return response;
    }),

  getClientInlineStatus: orgProcedure
    .input(
      z.object({
        orgId: z.string().min(1),
        contactId: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phoneE164: z.string().min(7).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const contact = input.contactId
        ? await ctx.db.query.contacts.findFirst({
            where: (c, { and, eq, isNull }) =>
              and(eq(c.orgId, input.orgId), eq(c.id, input.contactId!), isNull(c.deletedAt)),
          })
        : input.email
          ? await ctx.db.query.contacts.findFirst({
              where: (c, { and, eq, isNull }) =>
                and(eq(c.orgId, input.orgId), isNull(c.deletedAt), eq(c.email, input.email!)),
            })
          : input.phoneE164
            ? await ctx.db.query.contacts.findFirst({
                where: (c, { and, eq, isNull }) =>
                  and(eq(c.orgId, input.orgId), isNull(c.deletedAt), eq(c.phoneE164, input.phoneE164!)),
              })
            : null;

      if (!contact) {
        return null;
      }

      const [latestInvoice, riskSnapshot] = await Promise.all([
        ctx.db.query.invoices.findFirst({
          where: (i, { and, eq, isNull }) =>
            and(eq(i.orgId, input.orgId), eq(i.contactId, contact.id), isNull(i.deletedAt)),
          orderBy: (i, { desc }) => [desc(i.dueDate), desc(i.createdAt)],
        }),
        ctx.db.query.clientRiskScores.findFirst({
          where: (r, { and, eq }) => and(eq(r.orgId, input.orgId), eq(r.contactId, contact.id)),
          orderBy: (r, { desc }) => [desc(r.computedAt)],
        }),
      ]);

      return {
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phoneE164: contact.phoneE164,
          timezone: contact.timezone,
        },
        latestInvoice: latestInvoice
          ? {
              id: latestInvoice.id,
              invoiceNumber: latestInvoice.invoiceNumber,
              status: toCanonicalInvoiceStatus(latestInvoice.status),
              amountDueMinor: latestInvoice.amountDueMinor,
              amountPaidMinor: latestInvoice.amountPaidMinor,
              dueDate: latestInvoice.dueDate,
            }
          : null,
        riskLevel: riskSnapshot?.riskLevel ?? null,
      };
    }),
});
