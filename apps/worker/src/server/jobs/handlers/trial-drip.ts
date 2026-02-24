import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { orgMembers } from "@/server/db/schema";
import { user } from "@/server/db/schema/users";
import { resendEmailAdapter } from "@/server/adapters/messaging/resend-email.adapter";

export type TrialDripPayload = {
  orgId: string;
  orgName: string;
  orgSlug: string;
  dayNumber: 0 | 3 | 7 | 12 | 14;
};

type DripContent = {
  subject: string;
  html: string;
  text: string;
};

function buildDripContent(
  orgName: string,
  orgSlug: string,
  dayNumber: TrialDripPayload["dayNumber"],
  appUrl: string
): DripContent {
  const dashboardUrl = `${appUrl}/${orgSlug}/overview`;
  const workflowUrl = `${appUrl}/${orgSlug}/flows`;
  const plansUrl = `${appUrl}/${orgSlug}/plans`;
  const onboardingUrl = `${appUrl}/${orgSlug}/onboarding`;

  switch (dayNumber) {
    case 0:
      return {
        subject: "Welcome to DueFlow — let's get your first workflow live",
        html: `
<p>Hi there,</p>
<p>Welcome to DueFlow! You're now on a 14-day free trial with full Growth+ access — no credit card required.</p>
<p>The fastest way to see value: <strong>set up your first invoice follow-up workflow in under 5 minutes.</strong></p>
<p><a href="${onboardingUrl}" style="background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Complete setup →</a></p>
<p>Once your workflow is live, DueFlow automatically sends reminders, escalates overdue invoices, and tracks every interaction — so you don't have to chase anyone manually.</p>
<p>Questions? Just reply to this email.</p>
<p>— The DueFlow Team</p>
        `.trim(),
        text: `Welcome to DueFlow!\n\nComplete your setup to go live: ${onboardingUrl}`,
      };

    case 3:
      return {
        subject: "DueFlow check-in: have you run your first workflow?",
        html: `
<p>Hi there,</p>
<p>3 days in — have you set up your first workflow for ${orgName}?</p>
<p>It takes less than 5 minutes. Here's what you get immediately:</p>
<ul>
  <li>Automatic email reminders when invoices go overdue</li>
  <li>SMS escalation for high-value clients</li>
  <li>Real-time notifications when clients pay</li>
</ul>
<p><a href="${workflowUrl}" style="background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Set up your first workflow →</a></p>
<p>— The DueFlow Team</p>
        `.trim(),
        text: `Day 3 check-in — set up your first workflow: ${workflowUrl}`,
      };

    case 7:
      return {
        subject: "Halfway through your DueFlow trial — here's where you stand",
        html: `
<p>Hi there,</p>
<p>You're halfway through your trial. Here's your DueFlow dashboard for ${orgName}:</p>
<p><a href="${dashboardUrl}">View your full dashboard →</a></p>
<p>If you haven't sent your first automated reminder yet, now is the time — you have 7 days left of full access.</p>
<p><a href="${workflowUrl}" style="background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Activate a workflow →</a></p>
<p>— The DueFlow Team</p>
        `.trim(),
        text: `Day 7 — halfway through your trial. View your dashboard: ${dashboardUrl}`,
      };

    case 12:
      return {
        subject: "2 days left: keep everything you've built in DueFlow",
        html: `
<p>Hi there,</p>
<p>Your DueFlow trial ends in <strong>2 days</strong>.</p>
<p>Upgrade now to keep your workflows, contacts, and invoices — and stay on autopilot.</p>
<p>We've pre-selected <strong>Growth+ at $79/mo</strong> based on your usage. You can change it at any time.</p>
<p><a href="${plansUrl}" style="background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Upgrade to Growth+ →</a></p>
<p>— The DueFlow Team</p>
        `.trim(),
        text: `Trial ends in 2 days. Upgrade now: ${plansUrl}`,
      };

    case 14:
      return {
        subject: "Your DueFlow trial has ended — add a card to continue",
        html: `
<p>Hi there,</p>
<p>Your 14-day trial for ${orgName} has ended.</p>
<p><strong>Your data is safe.</strong> Add a payment method to reactivate your account and keep all your workflows, invoices, and contacts exactly as you left them.</p>
<p><a href="${plansUrl}" style="background:#18181b;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Add card &amp; continue →</a></p>
<p>— The DueFlow Team</p>
        `.trim(),
        text: `Trial ended. Add a card to continue: ${plansUrl}`,
      };
  }
}

export async function handleTrialDripJob(payload: TrialDripPayload): Promise<void> {
  // Find the org owner's email
  const ownerMembership = await db.query.orgMembers.findFirst({
    where: (m, { and, eq: eqFn, isNull }) =>
      and(
        eqFn(m.orgId, payload.orgId),
        eqFn(m.role, "OWNER"),
        isNull(m.deletedAt),
      ),
    with: { user: true },
  });

  if (!ownerMembership?.user?.email) {
    console.warn(
      `[trial-drip] No owner email found for org ${payload.orgId} — skipping day ${payload.dayNumber}`
    );
    return;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "https://app.dueflow.ai";

  const content = buildDripContent(
    payload.orgName,
    payload.orgSlug,
    payload.dayNumber,
    appUrl
  );

  await resendEmailAdapter.sendEmail({
    to: ownerMembership.user.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
    tags: [
      { name: "category", value: "trial-drip" },
      { name: "day", value: String(payload.dayNumber) },
    ],
  });

  console.log(
    `[trial-drip] Sent day-${payload.dayNumber} email to ${ownerMembership.user.email} for org ${payload.orgId}`
  );
}
