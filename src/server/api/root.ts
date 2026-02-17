import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { auditRouter } from "@/server/api/routers/audit";
import { automationRouter } from "@/server/api/routers/automation";
import { callsRouter } from "@/server/api/routers/calls";
import { contactsRouter } from "@/server/api/routers/contacts";
import { conversationsRouter } from "@/server/api/routers/conversations";
import { invoicesRouter } from "@/server/api/routers/invoices";
import { orgRouter } from "@/server/api/routers/org";
import { paymentPlansRouter } from "@/server/api/routers/paymentPlans";
import { paymentsRouter } from "@/server/api/routers/payments";
import { reportsRouter } from "@/server/api/routers/reports";
import { settingsRouter } from "@/server/api/routers/settings";

export const appRouter = createTRPCRouter({
  org: orgRouter,
  contacts: contactsRouter,
  paymentPlans: paymentPlansRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  automation: automationRouter,
  conversations: conversationsRouter,
  reports: reportsRouter,
  settings: settingsRouter,
  calls: callsRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
