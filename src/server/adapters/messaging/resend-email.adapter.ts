import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const resendEmailAdapter = {
  async sendEmail(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    replyTo?: string;
    tags?: Array<{ name: string; value: string }>;
  }): Promise<{ providerMessageId: string }> {
    if (!resend) {
      console.log("[MOCK EMAIL]", { to: input.to, subject: input.subject });
      return { providerMessageId: `resend_mock_${crypto.randomUUID()}` };
    }

    const fromEmail =
      process.env.RESEND_FROM_EMAIL ?? "noreply@dueflow.app";

    const result = await resend.emails.send({
      from: fromEmail,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      tags: input.tags,
    });

    if (result.error) {
      throw new Error(`Resend email failed: ${result.error.message}`);
    }

    return {
      providerMessageId: result.data?.id ?? `resend_${crypto.randomUUID()}`,
    };
  },
};
