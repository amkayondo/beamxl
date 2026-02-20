import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { auditRouter } from "@/server/api/routers/audit";
import { automationRouter } from "@/server/api/routers/automation";
import { callsRouter } from "@/server/api/routers/calls";
import { billingRouter } from "@/server/api/routers/billing";
import { complianceRouter } from "@/server/api/routers/compliance";
import { contactsRouter } from "@/server/api/routers/contacts";
import { conversationsRouter } from "@/server/api/routers/conversations";
import { flowsRouter } from "@/server/api/routers/flows";
import { importRouter } from "@/server/api/routers/import";
import { invoicesRouter } from "@/server/api/routers/invoices";
import { orgRouter } from "@/server/api/routers/org";
import { paymentPlansRouter } from "@/server/api/routers/paymentPlans";
import { paymentsRouter } from "@/server/api/routers/payments";
import { reportsRouter } from "@/server/api/routers/reports";
import { settingsRouter } from "@/server/api/routers/settings";
import { tagsRouter } from "@/server/api/routers/tags";
import { notificationsRouter } from "@/server/api/routers/notifications";
import { templatesRouter } from "@/server/api/routers/templates";
import { systemAdminRouter } from "@/server/api/routers/system-admin";

export const appRouter = createTRPCRouter({
  org: orgRouter,
  contacts: contactsRouter,
  paymentPlans: paymentPlansRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  automation: automationRouter,
  conversations: conversationsRouter,
  compliance: complianceRouter,
  flows: flowsRouter,
  import: importRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  calls: callsRouter,
  billing: billingRouter,
  audit: auditRouter,
  tags: tagsRouter,
  templates: templatesRouter,
  notifications: notificationsRouter,
  systemAdmin: systemAdminRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
