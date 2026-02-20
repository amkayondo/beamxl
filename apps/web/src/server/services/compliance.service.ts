import { and, eq, gte, isNull, sql } from "drizzle-orm";

import { db } from "@/server/db";
import {
  complianceSettings,
  contactConsents,
  contacts,
  messageLogs,
  stateComplianceRules,
} from "@/server/db/schema";

// ---------------------------------------------------------------------------
// checkComplianceForOutbound
// ---------------------------------------------------------------------------

export async function checkComplianceForOutbound(input: {
  orgId: string;
  contactId: string;
  channel: "SMS" | "WHATSAPP" | "VOICE" | "EMAIL";
}): Promise<{ allowed: boolean; reason?: string; retryAfter?: Date }> {
  // 1. Contact opted out?
  const contact = await db.query.contacts.findFirst({
    where: (c: any, { and, eq }: any) =>
      and(eq(c.id, input.contactId), eq(c.orgId, input.orgId)),
  });

  if (!contact) {
    return { allowed: false, reason: "Contact not found" };
  }

  if (contact.optedOutAt) {
    return { allowed: false, reason: "Contact has opted out" };
  }

  // 2. Active consent for this channel?
  const consent = await db.query.contactConsents.findFirst({
    where: (cc: any, { and, eq, isNull }: any) =>
      and(
        eq(cc.orgId, input.orgId),
        eq(cc.contactId, input.contactId),
        eq(cc.channel, input.channel),
        isNull(cc.revokedAt),
      ),
  });

  if (!consent) {
    return {
      allowed: false,
      reason: `No active consent for channel ${input.channel}`,
    };
  }

  // Load org compliance settings (create default if missing)
  let settings = await db.query.complianceSettings.findFirst({
    where: (s: any, { eq }: any) => eq(s.orgId, input.orgId),
  });

  if (!settings) {
    const id = crypto.randomUUID();
    await db.insert(complianceSettings).values({
      id,
      orgId: input.orgId,
    });
    settings = await db.query.complianceSettings.findFirst({
      where: (s: any, { eq }: any) => eq(s.orgId, input.orgId),
    });
  }

  if (!settings) {
    return { allowed: false, reason: "Failed to load compliance settings" };
  }

  // 3. Within quiet hours?
  const contactTimezone = contact.timezone ?? settings.defaultTimezone;
  const nowInContact = new Date(
    new Date().toLocaleString("en-US", { timeZone: contactTimezone }),
  );
  const currentHour = nowInContact.getHours();

  // Check state-specific quiet hours first
  let quietStart = settings.quietHoursStart;
  let quietEnd = settings.quietHoursEnd;

  if (contact.stateCode) {
    const stateRule = await db.query.stateComplianceRules.findFirst({
      where: (r: any, { and, eq }: any) =>
        and(eq(r.orgId, input.orgId), eq(r.stateCode, contact.stateCode)),
    });

    if (stateRule) {
      if (stateRule.quietHoursStart !== null) quietStart = stateRule.quietHoursStart;
      if (stateRule.quietHoursEnd !== null) quietEnd = stateRule.quietHoursEnd;
    }
  }

  const isInQuietHours =
    quietStart > quietEnd
      ? currentHour >= quietStart || currentHour < quietEnd // e.g. 21-8 wraps midnight
      : currentHour >= quietStart && currentHour < quietEnd;

  if (isInQuietHours) {
    // Calculate when quiet hours end
    const retryAfter = new Date(nowInContact);
    if (quietStart > quietEnd) {
      // Wraps midnight — quiet ends at quietEnd hour today or tomorrow
      if (currentHour >= quietStart) {
        retryAfter.setDate(retryAfter.getDate() + 1);
      }
      retryAfter.setHours(quietEnd, 0, 0, 0);
    } else {
      retryAfter.setHours(quietEnd, 0, 0, 0);
    }

    return {
      allowed: false,
      reason: `Quiet hours: contact cannot be reached until ${quietEnd}:00 in ${contactTimezone}`,
      retryAfter,
    };
  }

  // 4. Frequency cap exceeded?
  let frequencyCap = settings.defaultFrequencyCap;
  let windowDays = settings.frequencyWindowDays;

  if (contact.stateCode) {
    const stateRule = await db.query.stateComplianceRules.findFirst({
      where: (r: any, { and, eq }: any) =>
        and(eq(r.orgId, input.orgId), eq(r.stateCode, contact.stateCode)),
    });

    if (stateRule) {
      frequencyCap = stateRule.frequencyCap;
      windowDays = stateRule.frequencyWindowDays;
    }
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.orgId, input.orgId),
        eq(messageLogs.contactId, input.contactId),
        eq(messageLogs.direction, "OUTBOUND"),
        gte(messageLogs.createdAt, windowStart),
      ),
    );

  const messageCount = Number(countResult[0]?.count ?? 0);

  if (messageCount >= frequencyCap) {
    return {
      allowed: false,
      reason: `Frequency cap exceeded: ${messageCount}/${frequencyCap} messages in ${windowDays} day window`,
    };
  }

  return { allowed: true };
}

// ---------------------------------------------------------------------------
// recordConsent
// ---------------------------------------------------------------------------

export async function recordConsent(input: {
  orgId: string;
  contactId: string;
  channel: "SMS" | "WHATSAPP" | "VOICE" | "EMAIL";
  method: "WRITTEN" | "VERBAL" | "ELECTRONIC" | "IMPORTED";
  evidenceUrl?: string;
  ipAddress?: string;
  notes?: string;
}) {
  const id = crypto.randomUUID();

  await db.insert(contactConsents).values({
    id,
    orgId: input.orgId,
    contactId: input.contactId,
    channel: input.channel,
    method: input.method,
    obtainedAt: new Date(),
    evidenceUrl: input.evidenceUrl ?? null,
    ipAddress: input.ipAddress ?? null,
    notes: input.notes ?? null,
  });

  return { consentId: id };
}

// ---------------------------------------------------------------------------
// revokeAllConsent
// ---------------------------------------------------------------------------

export async function revokeAllConsent(input: {
  orgId: string;
  contactId: string;
}) {
  await db
    .update(contactConsents)
    .set({
      revokedAt: new Date(),
      revokeMethod: "UNIVERSAL_OPT_OUT",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(contactConsents.orgId, input.orgId),
        eq(contactConsents.contactId, input.contactId),
        isNull(contactConsents.revokedAt),
      ),
    );
}

// ---------------------------------------------------------------------------
// getContactComplianceStatus
// ---------------------------------------------------------------------------

export async function getContactComplianceStatus(input: {
  orgId: string;
  contactId: string;
}) {
  const contact = await db.query.contacts.findFirst({
    where: (c: any, { and, eq }: any) =>
      and(eq(c.id, input.contactId), eq(c.orgId, input.orgId)),
  });

  if (!contact) {
    throw new Error("Contact not found");
  }

  // Get all consents for this contact
  const allConsents = await db.query.contactConsents.findMany({
    where: (cc: any, { and, eq }: any) =>
      and(eq(cc.orgId, input.orgId), eq(cc.contactId, input.contactId)),
    orderBy: (cc: any, { desc }: any) => [desc(cc.createdAt)],
  });

  // Consent status per channel
  const channels = ["SMS", "WHATSAPP", "VOICE", "EMAIL"] as const;
  const consentStatus = channels.map((channel) => {
    const activeConsent = allConsents.find(
      (c: any) => c.channel === channel && c.revokedAt === null,
    );
    return {
      channel,
      hasActiveConsent: !!activeConsent,
      consentMethod: activeConsent?.method ?? null,
      obtainedAt: activeConsent?.obtainedAt ?? null,
    };
  });

  // Load org settings
  let settings = await db.query.complianceSettings.findFirst({
    where: (s: any, { eq }: any) => eq(s.orgId, input.orgId),
  });

  let frequencyCap = settings?.defaultFrequencyCap ?? 7;
  let windowDays = settings?.frequencyWindowDays ?? 7;

  // Check state-specific rules
  if (contact.stateCode) {
    const stateRule = await db.query.stateComplianceRules.findFirst({
      where: (r: any, { and, eq }: any) =>
        and(eq(r.orgId, input.orgId), eq(r.stateCode, contact.stateCode)),
    });

    if (stateRule) {
      frequencyCap = stateRule.frequencyCap;
      windowDays = stateRule.frequencyWindowDays;
    }
  }

  // Frequency count
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);

  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(messageLogs)
    .where(
      and(
        eq(messageLogs.orgId, input.orgId),
        eq(messageLogs.contactId, input.contactId),
        eq(messageLogs.direction, "OUTBOUND"),
        gte(messageLogs.createdAt, windowStart),
      ),
    );

  const messagesInWindow = Number(countResult[0]?.count ?? 0);

  // Next allowed contact time
  const contactTimezone = contact.timezone ?? settings?.defaultTimezone ?? "America/New_York";
  const nowInContact = new Date(
    new Date().toLocaleString("en-US", { timeZone: contactTimezone }),
  );
  const currentHour = nowInContact.getHours();

  let quietStart = settings?.quietHoursStart ?? 21;
  let quietEnd = settings?.quietHoursEnd ?? 8;

  if (contact.stateCode) {
    const stateRule = await db.query.stateComplianceRules.findFirst({
      where: (r: any, { and, eq }: any) =>
        and(eq(r.orgId, input.orgId), eq(r.stateCode, contact.stateCode)),
    });
    if (stateRule) {
      if (stateRule.quietHoursStart !== null) quietStart = stateRule.quietHoursStart;
      if (stateRule.quietHoursEnd !== null) quietEnd = stateRule.quietHoursEnd;
    }
  }

  const isInQuietHours =
    quietStart > quietEnd
      ? currentHour >= quietStart || currentHour < quietEnd
      : currentHour >= quietStart && currentHour < quietEnd;

  let nextAllowedContactTime: Date | null = null;
  if (isInQuietHours) {
    nextAllowedContactTime = new Date(nowInContact);
    if (quietStart > quietEnd && currentHour >= quietStart) {
      nextAllowedContactTime.setDate(nextAllowedContactTime.getDate() + 1);
    }
    nextAllowedContactTime.setHours(quietEnd, 0, 0, 0);
  }

  return {
    contactId: input.contactId,
    optedOut: !!contact.optedOutAt,
    optedOutAt: contact.optedOutAt,
    consentStatus,
    frequency: {
      messagesInWindow,
      frequencyCap,
      windowDays,
      remaining: Math.max(0, frequencyCap - messagesInWindow),
    },
    quietHours: {
      isInQuietHours,
      quietHoursStart: quietStart,
      quietHoursEnd: quietEnd,
      timezone: contactTimezone,
      nextAllowedContactTime,
    },
    stateCode: contact.stateCode,
  };
}
