import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { agentRouter } from "@/server/api/routers/agent";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { auditRouter } from "@/server/api/routers/audit";
import { automationRouter } from "@/server/api/routers/automation";
import { callsRouter } from "@/server/api/routers/calls";
import { billingRouter } from "@/server/api/routers/billing";
import { commandsRouter } from "@/server/api/routers/commands";
import { complianceRouter } from "@/server/api/routers/compliance";
import { contactsRouter } from "@/server/api/routers/contacts";
import { conversationsRouter } from "@/server/api/routers/conversations";
import { exceptionsRouter } from "@/server/api/routers/exceptions";
import { extensionRouter } from "@/server/api/routers/extension";
import { flowsRouter } from "@/server/api/routers/flows";
import { goalsDashboardRouter } from "@/server/api/routers/goalsDashboard";
import { importRouter } from "@/server/api/routers/import";
import { invoicesRouter } from "@/server/api/routers/invoices";
import { onboardingRouter } from "@/server/api/routers/onboarding";
import { orgRouter } from "@/server/api/routers/org";
import { paymentPlansRouter } from "@/server/api/routers/paymentPlans";
import { paymentsRouter } from "@/server/api/routers/payments";
import { portalRouter } from "@/server/api/routers/portal";
import { reportsRouter } from "@/server/api/routers/reports";
import { settingsRouter } from "@/server/api/routers/settings";
import { surveysRouter } from "@/server/api/routers/surveys";
import { tagsRouter } from "@/server/api/routers/tags";
import { notificationsRouter } from "@/server/api/routers/notifications";
import { templatesRouter } from "@/server/api/routers/templates";
import { systemAdminRouter } from "@/server/api/routers/system-admin";
import { workflowTemplatesRouter } from "@/server/api/routers/workflowTemplates";

export const appRouter = createTRPCRouter({
  agent: agentRouter,
  analytics: analyticsRouter,
  onboarding: onboardingRouter,
  org: orgRouter,
  contacts: contactsRouter,
  paymentPlans: paymentPlansRouter,
  invoices: invoicesRouter,
  payments: paymentsRouter,
  portal: portalRouter,
  automation: automationRouter,
  conversations: conversationsRouter,
  extension: extensionRouter,
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
  workflowTemplates: workflowTemplatesRouter,
  surveys: surveysRouter,
  exceptions: exceptionsRouter,
  goalsDashboard: goalsDashboardRouter,
  commands: commandsRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
