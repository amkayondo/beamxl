// ---------------------------------------------------------------------------
// Email Template Service
// ---------------------------------------------------------------------------

/**
 * Replace {{var}} placeholders in subject and htmlBody, and produce a
 * plain-text fallback by stripping HTML tags.
 */
export function renderEmailTemplate(input: {
  subject: string;
  htmlBody: string;
  variables: Record<string, string>;
}): { subject: string; html: string; text: string } {
  const replace = (template: string, vars: Record<string, string>) =>
    Object.entries(vars).reduce(
      (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
      template,
    );

  const subject = replace(input.subject, input.variables);
  const html = replace(input.htmlBody, input.variables);

  // Strip HTML tags for plain-text version
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Shared email layout wrapper
// ---------------------------------------------------------------------------

function wrapInLayout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BeamFlow</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px;background-color:#1a1a2e;text-align:center;">
              <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">BeamFlow</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${bodyContent}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;background-color:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                You are receiving this email because you have an outstanding account with us.<br />
                If you believe this was sent in error, please contact us.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Pay Now button
// ---------------------------------------------------------------------------

function payNowButton(payLink: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto;">
  <tr>
    <td align="center" style="border-radius:6px;background-color:#2563eb;">
      <a href="${payLink}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">Pay Now</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Default email HTML templates
// ---------------------------------------------------------------------------

const defaultEmailTemplates: Record<
  string,
  { subject: string; buildHtml: (vars: Record<string, string>) => string }
> = {
  FRIENDLY_REMINDER: {
    subject: "Friendly payment reminder - {{amount}} due {{dueDate}}",
    buildHtml: (vars) =>
      wrapInLayout(`
        <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;">Friendly Reminder</h1>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          Hi ${vars.name},
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          This is a friendly reminder that your payment of <strong>${vars.amount}</strong>
          for the period <strong>${vars.period}</strong> is due on <strong>${vars.dueDate}</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          Please click the button below to make your payment at your convenience.
        </p>
        ${payNowButton(vars.payLink ?? "")}
        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
          If you have already made this payment, please disregard this message. Thank you!
        </p>
      `),
  },

  DUE_TODAY: {
    subject: "Payment of {{amount}} is due today",
    buildHtml: (vars) =>
      wrapInLayout(`
        <h1 style="margin:0 0 16px;font-size:22px;color:#1a1a2e;">Payment Due Today</h1>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          Hi ${vars.name},
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          Your payment of <strong>${vars.amount}</strong> is due <strong>today</strong>.
          Please take a moment to complete your payment to avoid any late fees.
        </p>
        ${payNowButton(vars.payLink ?? "")}
        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
          If you have already submitted your payment, it may take a short while to process. Thank you for your prompt attention.
        </p>
      `),
  },

  LATE_NOTICE: {
    subject: "Payment overdue - {{amount}} was due on {{dueDate}}",
    buildHtml: (vars) =>
      wrapInLayout(`
        <h1 style="margin:0 0 16px;font-size:22px;color:#b91c1c;">Payment Overdue</h1>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          Hi ${vars.name},
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          We noticed that your payment of <strong>${vars.amount}</strong> was due on
          <strong>${vars.dueDate}</strong> and has not yet been received.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          Please settle this balance as soon as possible to avoid additional fees or service interruptions.
        </p>
        ${payNowButton(vars.payLink ?? "")}
        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
          If you are experiencing difficulties, please reach out to us so we can discuss payment options.
        </p>
      `),
  },

  FINAL_NOTICE: {
    subject: "Final notice - {{amount}} payment required immediately",
    buildHtml: (vars) =>
      wrapInLayout(`
        <h1 style="margin:0 0 16px;font-size:22px;color:#b91c1c;">Final Payment Notice</h1>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          Hi ${vars.name},
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          This is our <strong>final notice</strong> regarding your outstanding balance of
          <strong>${vars.amount}</strong>. Despite previous reminders, we have not yet received
          your payment.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
          Please make your payment immediately to avoid further action on your account.
        </p>
        ${payNowButton(vars.payLink ?? "")}
        <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
          If you believe there has been an error or need to arrange a payment plan, please contact us right away.
        </p>
      `),
  },

  RECEIPT_CONFIRMATION: {
    subject: "Payment received - Thank you!",
    buildHtml: (vars) =>
      wrapInLayout(`
        <h1 style="margin:0 0 16px;font-size:22px;color:#059669;">Payment Received</h1>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          Hi ${vars.name},
        </p>
        <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
          We have received your payment of <strong>${vars.amount}</strong>. Thank you
          for your prompt payment!
        </p>
        <p style="margin:0 0 0;font-size:15px;color:#374151;line-height:1.6;">
          No further action is required on your part. If you have any questions about
          your account, feel free to reach out.
        </p>
      `),
  },
};

/**
 * Returns a fully rendered default HTML email for the given template key,
 * with variables interpolated.
 */
export function getDefaultEmailHtml(
  templateKey: string,
  variables: Record<string, string>,
): { subject: string; html: string; text: string } {
  const template = defaultEmailTemplates[templateKey];

  if (!template) {
    // Graceful fallback: simple text-in-HTML email
    const subject = `Payment notification`;
    const html = wrapInLayout(`
      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;">
        Hi ${variables.name ?? "there"},
      </p>
      <p style="margin:12px 0;font-size:15px;color:#374151;line-height:1.6;">
        This is a notification regarding your account.
      </p>
      ${variables.payLink ? payNowButton(variables.payLink) : ""}
    `);

    return renderEmailTemplate({
      subject,
      htmlBody: html,
      variables,
    });
  }

  const subject = Object.entries(variables).reduce(
    (acc, [k, v]) => acc.replaceAll(`{{${k}}}`, v),
    template.subject,
  );

  const html = template.buildHtml(variables);

  // Generate plain text from the rendered HTML
  const text = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { subject, html, text };
}
