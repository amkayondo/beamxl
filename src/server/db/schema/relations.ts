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

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
  orgMemberships: many(orgMembers),
  assignedConversations: many(conversations),
  auditLogs: many(auditLogs),
  notifications: many(notifications),
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

export const orgRelations = relations(orgs, ({ one, many }) => ({
  createdByUser: one(user, {
    fields: [orgs.createdByUserId],
    references: [user.id],
  }),
  members: many(orgMembers),
  contacts: many(contacts),
  paymentPlans: many(paymentPlans),
  invoices: many(invoices),
  automationRules: many(automationRules),
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
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  org: one(orgs, {
    fields: [payments.orgId],
    references: [orgs.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));

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
}));

export const flowRunsRelations = relations(flowRuns, ({ one }) => ({
  flow: one(flows, {
    fields: [flowRuns.flowId],
    references: [flows.id],
  }),
  org: one(orgs, {
    fields: [flowRuns.orgId],
    references: [orgs.id],
  }),
}));

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
