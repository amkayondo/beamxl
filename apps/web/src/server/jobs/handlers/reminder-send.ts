import { sendReminderForInvoice } from "@/server/services/reminder.service";

export async function handleReminderSendJob(payload: {
  orgId: string;
  invoiceId: string;
  templateKey: "FRIENDLY_REMINDER" | "DUE_TODAY" | "LATE_NOTICE" | "FINAL_NOTICE";
}) {
  return sendReminderForInvoice(payload);
}
