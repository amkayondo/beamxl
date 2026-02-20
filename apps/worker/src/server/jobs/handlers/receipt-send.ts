import { sendReceiptConfirmation } from "@/server/services/reminder.service";

export async function handleReceiptSendJob(payload: {
  orgId: string;
  invoiceId: string;
}) {
  return sendReceiptConfirmation(payload);
}
