import { relations } from "drizzle-orm";

import { account, session, user } from "./users";
import { orgMembers, orgs } from "./organizations";
import { contactTags, contacts, tags } from "./contacts";
import { paymentPlans } from "./plans";
import { invoices } from "./invoices";
import { payments } from "./payments";
import { automationRules } from "./automation";
import { messageTemplates } from "./templates";
import { conversations } from "./conversations";
import { auditLogs, callLogs, messageLogs } from "./logs";
import { integrationSettings } from "./integrations";
import { orgIntegrations } from "./org-integrations";
import { webhookEvents } from "./webhook-events";
import { flowRuns, flows } from "./flows";
import {
  complianceSettings,
  contactConsents,
  stateComplianceRules,
} from "./compliance";
import { notifications } from "./notifications";
import {
  creditTopups,
  orgPlanSubscriptions,
  overageCaps,
  overageEvents,
  planCatalog,
  trialState,
  usageCredits,
} from "./billing";
import {
  workflowAbTests,
  workflowApprovals,
  workflowEdges,
  workflowNodes,
  workflowRunSteps,
  workflowVersions,
} from "./workflow-runtime";
import {
  interactiveMessages,
  interactiveOptions,
  interactiveResponses,
  surveyQuestions,
  surveyResponses,
  surveys,
} from "./interactions";
import {
  channelEffectivenessDaily,
  clientRiskScores,
  forecastSnapshots,
  invoiceHealthScores,
} from "./intelligence";
import {
  chargebackEvents,
  disputeEvents,
  disputes,
  legalRiskFlags,
} from "./disputes";
import {
  agentDecisions,
  agentGoalProgress,
  agentGoals,
  agentTasks,
  approvalRequests,
  ownerCommands,
} from "./agents";
import {
  clientPortalAccounts,
  clientPortalSessions,
  paymentPlanRequests,
  portalPreferences,
} from "./portal";
import { integrationConnections, integrationSyncJobs } from "./integration-phase2";

// ------------------------------
// Identity
// ------------------------------

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  orgMemberships: many(orgMembers),
  assignedConversations: many(conversations),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
  approvedTemplates: many(messageTemplates),
  createdWorkflowVersions: many(workflowVersions),
  decidedWorkflowApprovals: many(workflowApprovals),
  resolvedDisputes: many(disputes),
  disputeEvents: many(disputeEvents),
  resolvedLegalRiskFlags: many(legalRiskFlags),
  agentGoals: many(agentGoals),
  agentTasks: many(agentTasks),
  ownerCommands: many(ownerCommands),
  overriddenAgentDecisions: many(agentDecisions),
  decidedApprovalRequests: many(approvalRequests),
  resolvedPaymentPlanRequests: many(paymentPlanRequests),
  createdSurveys: many(surveys),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

// ------------------------------
// Organization
// ------------------------------

export const orgRelations = relations(orgs, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [orgs.createdByUserId],
    references: [user.id],
  }),

  members: many(orgMembers),
  contacts: many(contacts),
  tags: many(tags),
  paymentPlans: many(paymentPlans),
  invoices: many(invoices),
  payments: many(payments),
  automationRules: many(automationRules),
  templates: many(messageTemplates),
  conversations: many(conversations),
  messageLogs: many(messageLogs),
  callLogs: many(callLogs),
  auditLogs: many(auditLogs),
  integrationSettings: many(integrationSettings),
  orgIntegrations: many(orgIntegrations),
  webhookEvents: many(webhookEvents),
  flows: many(flows),
  flowRuns: many(flowRuns),
  complianceSettings: many(complianceSettings),
  stateComplianceRules: many(stateComplianceRules),
  contactConsents: many(contactConsents),
  notifications: many(notifications),

  // Billing
  planSubscriptions: many(orgPlanSubscriptions),
  usageCredits: many(usageCredits),
  creditTopups: many(creditTopups),
  overageEvents: many(overageEvents),
  overageCaps: many(overageCaps),
  trialState: many(trialState),

  // Workflow runtime
  workflowVersions: many(workflowVersions),
  workflowNodes: many(workflowNodes),
  workflowEdges: many(workflowEdges),
  workflowRunSteps: many(workflowRunSteps),
  workflowApprovals: many(workflowApprovals),
  workflowAbTests: many(workflowAbTests),

  // Interactions
  interactiveMessages: many(interactiveMessages),
  interactiveOptions: many(interactiveOptions),
  interactiveResponses: many(interactiveResponses),
  surveys: many(surveys),
  surveyQuestions: many(surveyQuestions),
  surveyResponses: many(surveyResponses),

  // Intelligence
  clientRiskScores: many(clientRiskScores),
  invoiceHealthScores: many(invoiceHealthScores),
  forecastSnapshots: many(forecastSnapshots),
  channelEffectivenessDaily: many(channelEffectivenessDaily),

  // Disputes/legal
  disputes: many(disputes),
  disputeEvents: many(disputeEvents),
  legalRiskFlags: many(legalRiskFlags),
  chargebackEvents: many(chargebackEvents),

  // Agent
  agentGoals: many(agentGoals),
  agentGoalProgress: many(agentGoalProgress),
  agentTasks: many(agentTasks),
  ownerCommands: many(ownerCommands),
  agentDecisions: many(agentDecisions),
  approvalRequests: many(approvalRequests),

  // Portal
  clientPortalAccounts: many(clientPortalAccounts),
  clientPortalSessions: many(clientPortalSessions),
  portalPreferences: many(portalPreferences),
  paymentPlanRequests: many(paymentPlanRequests),

  // Phase 2/3 integrations
  integrationConnections: many(integrationConnections),
  integrationSyncJobs: many(integrationSyncJobs),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  org: one(orgs, {
    fields: [orgMembers.orgId],
    references: [orgs.id],
  }),
  user: one(user, {
    fields: [orgMembers.userId],
    references: [user.id],
  }),
  invitedBy: one(user, {
    fields: [orgMembers.invitedByUserId],
    references: [user.id],
  }),
}));

// ------------------------------
// Contacts, tags, plans, invoices
// ------------------------------

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  org: one(orgs, {
    fields: [contacts.orgId],
    references: [orgs.id],
  }),
  paymentPlans: many(paymentPlans),
  invoices: many(invoices),
  conversations: many(conversations),
  messageLogs: many(messageLogs),
  callLogs: many(callLogs),
  contactTags: many(contactTags),
  consents: many(contactConsents),

  // New domains
  interactiveMessages: many(interactiveMessages),
  interactiveResponses: many(interactiveResponses),
  surveyResponses: many(surveyResponses),
  clientRiskScores: many(clientRiskScores),
  disputes: many(disputes),
  legalRiskFlags: many(legalRiskFlags),
  agentDecisions: many(agentDecisions),
  clientPortalAccounts: many(clientPortalAccounts),
  portalPreferences: many(portalPreferences),
  paymentPlanRequests: many(paymentPlanRequests),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  org: one(orgs, {
    fields: [tags.orgId],
    references: [orgs.id],
  }),
  contactTags: many(contactTags),
}));

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  org: one(orgs, {
    fields: [contactTags.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [contactTags.contactId],
    references: [contacts.id],
  }),
  tag: one(tags, {
    fields: [contactTags.tagId],
    references: [tags.id],
  }),
}));

export const paymentPlansRelations = relations(paymentPlans, ({ one, many }) => ({
  org: one(orgs, {
    fields: [paymentPlans.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [paymentPlans.contactId],
    references: [contacts.id],
  }),
  invoices: many(invoices),
  paymentPlanRequests: many(paymentPlanRequests),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  org: one(orgs, {
    fields: [invoices.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [invoices.contactId],
    references: [contacts.id],
  }),
  paymentPlan: one(paymentPlans, {
    fields: [invoices.paymentPlanId],
    references: [paymentPlans.id],
  }),

  payments: many(payments),
  messageLogs: many(messageLogs),
  callLogs: many(callLogs),

  // New domains
  interactiveMessages: many(interactiveMessages),
  surveyResponses: many(surveyResponses),
  invoiceHealthScores: many(invoiceHealthScores),
  disputes: many(disputes),
  legalRiskFlags: many(legalRiskFlags),
  chargebackEvents: many(chargebackEvents),
  agentDecisions: many(agentDecisions),
  paymentPlanRequests: many(paymentPlanRequests),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  org: one(orgs, {
    fields: [payments.orgId],
    references: [orgs.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
  chargebackEvents: many(chargebackEvents),
}));

// ------------------------------
// Automation/templates/comms
// ------------------------------

export const automationRulesRelations = relations(automationRules, ({ one }) => ({
  org: one(orgs, {
    fields: [automationRules.orgId],
    references: [orgs.id],
  }),
  template: one(messageTemplates, {
    fields: [automationRules.templateId],
    references: [messageTemplates.id],
  }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one, many }) => ({
  org: one(orgs, {
    fields: [messageTemplates.orgId],
    references: [orgs.id],
  }),
  approvedByUser: one(user, {
    fields: [messageTemplates.approvedByUserId],
    references: [user.id],
  }),
  automationRules: many(automationRules),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  org: one(orgs, {
    fields: [conversations.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [conversations.contactId],
    references: [contacts.id],
  }),
  assignedToUser: one(user, {
    fields: [conversations.assignedToUserId],
    references: [user.id],
  }),
  messageLogs: many(messageLogs),
  callLogs: many(callLogs),
  interactiveMessages: many(interactiveMessages),
}));

export const messageLogsRelations = relations(messageLogs, ({ one }) => ({
  org: one(orgs, {
    fields: [messageLogs.orgId],
    references: [orgs.id],
  }),
  conversation: one(conversations, {
    fields: [messageLogs.conversationId],
    references: [conversations.id],
  }),
  contact: one(contacts, {
    fields: [messageLogs.contactId],
    references: [contacts.id],
  }),
  invoice: one(invoices, {
    fields: [messageLogs.invoiceId],
    references: [invoices.id],
  }),
}));

export const callLogsRelations = relations(callLogs, ({ one }) => ({
  org: one(orgs, {
    fields: [callLogs.orgId],
    references: [orgs.id],
  }),
  conversation: one(conversations, {
    fields: [callLogs.conversationId],
    references: [conversations.id],
  }),
  contact: one(contacts, {
    fields: [callLogs.contactId],
    references: [contacts.id],
  }),
  invoice: one(invoices, {
    fields: [callLogs.invoiceId],
    references: [invoices.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  org: one(orgs, {
    fields: [auditLogs.orgId],
    references: [orgs.id],
  }),
  actorUser: one(user, {
    fields: [auditLogs.actorUserId],
    references: [user.id],
  }),
}));

// ------------------------------
// Integrations/webhooks
// ------------------------------

export const integrationSettingsRelations = relations(
  integrationSettings,
  ({ one }) => ({
    org: one(orgs, {
      fields: [integrationSettings.orgId],
      references: [orgs.id],
    }),
  })
);

export const orgIntegrationsRelations = relations(orgIntegrations, ({ one }) => ({
  org: one(orgs, {
    fields: [orgIntegrations.orgId],
    references: [orgs.id],
  }),
}));

export const webhookEventsRelations = relations(webhookEvents, ({ one }) => ({
  org: one(orgs, {
    fields: [webhookEvents.orgId],
    references: [orgs.id],
  }),
}));

// ------------------------------
// Flows + runtime
// ------------------------------

export const flowsRelations = relations(flows, ({ one, many }) => ({
  org: one(orgs, {
    fields: [flows.orgId],
    references: [orgs.id],
  }),
  updatedByUser: one(user, {
    fields: [flows.updatedByUserId],
    references: [user.id],
  }),
  runs: many(flowRuns),
  versions: many(workflowVersions),
  abTests: many(workflowAbTests),
}));

export const flowRunsRelations = relations(flowRuns, ({ one, many }) => ({
  flow: one(flows, {
    fields: [flowRuns.flowId],
    references: [flows.id],
  }),
  org: one(orgs, {
    fields: [flowRuns.orgId],
    references: [orgs.id],
  }),
  runSteps: many(workflowRunSteps),
  agentDecisions: many(agentDecisions),
  approvalRequests: many(approvalRequests),
}));

export const workflowVersionsRelations = relations(workflowVersions, ({ one, many }) => ({
  org: one(orgs, {
    fields: [workflowVersions.orgId],
    references: [orgs.id],
  }),
  flow: one(flows, {
    fields: [workflowVersions.flowId],
    references: [flows.id],
  }),
  createdByUser: one(user, {
    fields: [workflowVersions.createdByUserId],
    references: [user.id],
  }),
  nodes: many(workflowNodes),
  edges: many(workflowEdges),
}));

export const workflowNodesRelations = relations(workflowNodes, ({ one, many }) => ({
  org: one(orgs, {
    fields: [workflowNodes.orgId],
    references: [orgs.id],
  }),
  version: one(workflowVersions, {
    fields: [workflowNodes.versionId],
    references: [workflowVersions.id],
  }),
  interactiveMessages: many(interactiveMessages),
}));

export const workflowEdgesRelations = relations(workflowEdges, ({ one }) => ({
  org: one(orgs, {
    fields: [workflowEdges.orgId],
    references: [orgs.id],
  }),
  version: one(workflowVersions, {
    fields: [workflowEdges.versionId],
    references: [workflowVersions.id],
  }),
}));

export const workflowRunStepsRelations = relations(workflowRunSteps, ({ one, many }) => ({
  org: one(orgs, {
    fields: [workflowRunSteps.orgId],
    references: [orgs.id],
  }),
  flowRun: one(flowRuns, {
    fields: [workflowRunSteps.flowRunId],
    references: [flowRuns.id],
  }),
  approvals: many(workflowApprovals),
}));

export const workflowApprovalsRelations = relations(workflowApprovals, ({ one }) => ({
  org: one(orgs, {
    fields: [workflowApprovals.orgId],
    references: [orgs.id],
  }),
  flowRunStep: one(workflowRunSteps, {
    fields: [workflowApprovals.flowRunStepId],
    references: [workflowRunSteps.id],
  }),
  decidedByUser: one(user, {
    fields: [workflowApprovals.decidedByUserId],
    references: [user.id],
  }),
}));

export const workflowAbTestsRelations = relations(workflowAbTests, ({ one }) => ({
  org: one(orgs, {
    fields: [workflowAbTests.orgId],
    references: [orgs.id],
  }),
  flow: one(flows, {
    fields: [workflowAbTests.flowId],
    references: [flows.id],
  }),
}));

// ------------------------------
// Compliance + notifications
// ------------------------------

export const contactConsentsRelations = relations(contactConsents, ({ one }) => ({
  org: one(orgs, {
    fields: [contactConsents.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [contactConsents.contactId],
    references: [contacts.id],
  }),
}));

export const complianceSettingsRelations = relations(complianceSettings, ({ one }) => ({
  org: one(orgs, {
    fields: [complianceSettings.orgId],
    references: [orgs.id],
  }),
}));

export const stateComplianceRulesRelations = relations(stateComplianceRules, ({ one }) => ({
  org: one(orgs, {
    fields: [stateComplianceRules.orgId],
    references: [orgs.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  org: one(orgs, {
    fields: [notifications.orgId],
    references: [orgs.id],
  }),
  user: one(user, {
    fields: [notifications.userId],
    references: [user.id],
  }),
}));

// ------------------------------
// Billing
// ------------------------------

export const planCatalogRelations = relations(planCatalog, ({ many }) => ({
  subscriptions: many(orgPlanSubscriptions),
}));

export const orgPlanSubscriptionsRelations = relations(orgPlanSubscriptions, ({ one }) => ({
  org: one(orgs, {
    fields: [orgPlanSubscriptions.orgId],
    references: [orgs.id],
  }),
  plan: one(planCatalog, {
    fields: [orgPlanSubscriptions.planId],
    references: [planCatalog.id],
  }),
}));

export const usageCreditsRelations = relations(usageCredits, ({ one }) => ({
  org: one(orgs, {
    fields: [usageCredits.orgId],
    references: [orgs.id],
  }),
}));

export const creditTopupsRelations = relations(creditTopups, ({ one }) => ({
  org: one(orgs, {
    fields: [creditTopups.orgId],
    references: [orgs.id],
  }),
}));

export const overageEventsRelations = relations(overageEvents, ({ one }) => ({
  org: one(orgs, {
    fields: [overageEvents.orgId],
    references: [orgs.id],
  }),
}));

export const overageCapsRelations = relations(overageCaps, ({ one }) => ({
  org: one(orgs, {
    fields: [overageCaps.orgId],
    references: [orgs.id],
  }),
}));

export const trialStateRelations = relations(trialState, ({ one }) => ({
  org: one(orgs, {
    fields: [trialState.orgId],
    references: [orgs.id],
  }),
}));

// ------------------------------
// Interactions + surveys
// ------------------------------

export const interactiveMessagesRelations = relations(interactiveMessages, ({ one, many }) => ({
  org: one(orgs, {
    fields: [interactiveMessages.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [interactiveMessages.contactId],
    references: [contacts.id],
  }),
  conversation: one(conversations, {
    fields: [interactiveMessages.conversationId],
    references: [conversations.id],
  }),
  invoice: one(invoices, {
    fields: [interactiveMessages.invoiceId],
    references: [invoices.id],
  }),
  workflowNode: one(workflowNodes, {
    fields: [interactiveMessages.workflowNodeId],
    references: [workflowNodes.id],
  }),
  options: many(interactiveOptions),
  responses: many(interactiveResponses),
}));

export const interactiveOptionsRelations = relations(interactiveOptions, ({ one }) => ({
  org: one(orgs, {
    fields: [interactiveOptions.orgId],
    references: [orgs.id],
  }),
  interactiveMessage: one(interactiveMessages, {
    fields: [interactiveOptions.interactiveMessageId],
    references: [interactiveMessages.id],
  }),
}));

export const interactiveResponsesRelations = relations(interactiveResponses, ({ one }) => ({
  org: one(orgs, {
    fields: [interactiveResponses.orgId],
    references: [orgs.id],
  }),
  interactiveMessage: one(interactiveMessages, {
    fields: [interactiveResponses.interactiveMessageId],
    references: [interactiveMessages.id],
  }),
  contact: one(contacts, {
    fields: [interactiveResponses.contactId],
    references: [contacts.id],
  }),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  org: one(orgs, {
    fields: [surveys.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(user, {
    fields: [surveys.createdByUserId],
    references: [user.id],
  }),
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
}));

export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  org: one(orgs, {
    fields: [surveyQuestions.orgId],
    references: [orgs.id],
  }),
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
  responses: many(surveyResponses),
}));

export const surveyResponsesRelations = relations(surveyResponses, ({ one }) => ({
  org: one(orgs, {
    fields: [surveyResponses.orgId],
    references: [orgs.id],
  }),
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyResponses.questionId],
    references: [surveyQuestions.id],
  }),
  contact: one(contacts, {
    fields: [surveyResponses.contactId],
    references: [contacts.id],
  }),
  invoice: one(invoices, {
    fields: [surveyResponses.invoiceId],
    references: [invoices.id],
  }),
}));

// ------------------------------
// Intelligence
// ------------------------------

export const clientRiskScoresRelations = relations(clientRiskScores, ({ one }) => ({
  org: one(orgs, {
    fields: [clientRiskScores.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [clientRiskScores.contactId],
    references: [contacts.id],
  }),
}));

export const invoiceHealthScoresRelations = relations(invoiceHealthScores, ({ one }) => ({
  org: one(orgs, {
    fields: [invoiceHealthScores.orgId],
    references: [orgs.id],
  }),
  invoice: one(invoices, {
    fields: [invoiceHealthScores.invoiceId],
    references: [invoices.id],
  }),
}));

export const forecastSnapshotsRelations = relations(forecastSnapshots, ({ one }) => ({
  org: one(orgs, {
    fields: [forecastSnapshots.orgId],
    references: [orgs.id],
  }),
}));

export const channelEffectivenessDailyRelations = relations(
  channelEffectivenessDaily,
  ({ one }) => ({
    org: one(orgs, {
      fields: [channelEffectivenessDaily.orgId],
      references: [orgs.id],
    }),
  })
);

// ------------------------------
// Disputes / legal / chargebacks
// ------------------------------

export const disputesRelations = relations(disputes, ({ one, many }) => ({
  org: one(orgs, {
    fields: [disputes.orgId],
    references: [orgs.id],
  }),
  invoice: one(invoices, {
    fields: [disputes.invoiceId],
    references: [invoices.id],
  }),
  contact: one(contacts, {
    fields: [disputes.contactId],
    references: [contacts.id],
  }),
  resolvedByUser: one(user, {
    fields: [disputes.resolvedByUserId],
    references: [user.id],
  }),
  events: many(disputeEvents),
}));

export const disputeEventsRelations = relations(disputeEvents, ({ one }) => ({
  org: one(orgs, {
    fields: [disputeEvents.orgId],
    references: [orgs.id],
  }),
  dispute: one(disputes, {
    fields: [disputeEvents.disputeId],
    references: [disputes.id],
  }),
  actorUser: one(user, {
    fields: [disputeEvents.actorUserId],
    references: [user.id],
  }),
}));

export const legalRiskFlagsRelations = relations(legalRiskFlags, ({ one }) => ({
  org: one(orgs, {
    fields: [legalRiskFlags.orgId],
    references: [orgs.id],
  }),
  invoice: one(invoices, {
    fields: [legalRiskFlags.invoiceId],
    references: [invoices.id],
  }),
  contact: one(contacts, {
    fields: [legalRiskFlags.contactId],
    references: [contacts.id],
  }),
  resolvedByUser: one(user, {
    fields: [legalRiskFlags.resolvedByUserId],
    references: [user.id],
  }),
}));

export const chargebackEventsRelations = relations(chargebackEvents, ({ one }) => ({
  org: one(orgs, {
    fields: [chargebackEvents.orgId],
    references: [orgs.id],
  }),
  invoice: one(invoices, {
    fields: [chargebackEvents.invoiceId],
    references: [invoices.id],
  }),
  payment: one(payments, {
    fields: [chargebackEvents.paymentId],
    references: [payments.id],
  }),
}));

// ------------------------------
// Agent
// ------------------------------

export const agentGoalsRelations = relations(agentGoals, ({ one, many }) => ({
  org: one(orgs, {
    fields: [agentGoals.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(user, {
    fields: [agentGoals.createdByUserId],
    references: [user.id],
  }),
  progress: many(agentGoalProgress),
}));

export const agentGoalProgressRelations = relations(agentGoalProgress, ({ one }) => ({
  org: one(orgs, {
    fields: [agentGoalProgress.orgId],
    references: [orgs.id],
  }),
  goal: one(agentGoals, {
    fields: [agentGoalProgress.goalId],
    references: [agentGoals.id],
  }),
}));

export const agentTasksRelations = relations(agentTasks, ({ one, many }) => ({
  org: one(orgs, {
    fields: [agentTasks.orgId],
    references: [orgs.id],
  }),
  createdByUser: one(user, {
    fields: [agentTasks.createdByUserId],
    references: [user.id],
  }),
  approvalRequests: many(approvalRequests),
}));

export const ownerCommandsRelations = relations(ownerCommands, ({ one }) => ({
  org: one(orgs, {
    fields: [ownerCommands.orgId],
    references: [orgs.id],
  }),
  user: one(user, {
    fields: [ownerCommands.userId],
    references: [user.id],
  }),
}));

export const agentDecisionsRelations = relations(agentDecisions, ({ one }) => ({
  org: one(orgs, {
    fields: [agentDecisions.orgId],
    references: [orgs.id],
  }),
  flowRun: one(flowRuns, {
    fields: [agentDecisions.flowRunId],
    references: [flowRuns.id],
  }),
  invoice: one(invoices, {
    fields: [agentDecisions.invoiceId],
    references: [invoices.id],
  }),
  contact: one(contacts, {
    fields: [agentDecisions.contactId],
    references: [contacts.id],
  }),
  overriddenByUser: one(user, {
    fields: [agentDecisions.overriddenByUserId],
    references: [user.id],
  }),
}));

export const approvalRequestsRelations = relations(approvalRequests, ({ one }) => ({
  org: one(orgs, {
    fields: [approvalRequests.orgId],
    references: [orgs.id],
  }),
  agentTask: one(agentTasks, {
    fields: [approvalRequests.agentTaskId],
    references: [agentTasks.id],
  }),
  flowRun: one(flowRuns, {
    fields: [approvalRequests.flowRunId],
    references: [flowRuns.id],
  }),
  decidedByUser: one(user, {
    fields: [approvalRequests.decidedByUserId],
    references: [user.id],
  }),
}));

// ------------------------------
// Portal
// ------------------------------

export const clientPortalAccountsRelations = relations(clientPortalAccounts, ({ one, many }) => ({
  org: one(orgs, {
    fields: [clientPortalAccounts.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [clientPortalAccounts.contactId],
    references: [contacts.id],
  }),
  sessions: many(clientPortalSessions),
}));

export const clientPortalSessionsRelations = relations(clientPortalSessions, ({ one }) => ({
  org: one(orgs, {
    fields: [clientPortalSessions.orgId],
    references: [orgs.id],
  }),
  portalAccount: one(clientPortalAccounts, {
    fields: [clientPortalSessions.portalAccountId],
    references: [clientPortalAccounts.id],
  }),
}));

export const portalPreferencesRelations = relations(portalPreferences, ({ one }) => ({
  org: one(orgs, {
    fields: [portalPreferences.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [portalPreferences.contactId],
    references: [contacts.id],
  }),
}));

export const paymentPlanRequestsRelations = relations(paymentPlanRequests, ({ one }) => ({
  org: one(orgs, {
    fields: [paymentPlanRequests.orgId],
    references: [orgs.id],
  }),
  contact: one(contacts, {
    fields: [paymentPlanRequests.contactId],
    references: [contacts.id],
  }),
  invoice: one(invoices, {
    fields: [paymentPlanRequests.invoiceId],
    references: [invoices.id],
  }),
  resolvedByUser: one(user, {
    fields: [paymentPlanRequests.resolvedByUserId],
    references: [user.id],
  }),
}));

// ------------------------------
// Integration phase 2/3 scaffolds
// ------------------------------

export const integrationConnectionsRelations = relations(
  integrationConnections,
  ({ one, many }) => ({
    org: one(orgs, {
      fields: [integrationConnections.orgId],
      references: [orgs.id],
    }),
    syncJobs: many(integrationSyncJobs),
  })
);

export const integrationSyncJobsRelations = relations(integrationSyncJobs, ({ one }) => ({
  org: one(orgs, {
    fields: [integrationSyncJobs.orgId],
    references: [orgs.id],
  }),
  integrationConnection: one(integrationConnections, {
    fields: [integrationSyncJobs.integrationConnectionId],
    references: [integrationConnections.id],
  }),
}));
