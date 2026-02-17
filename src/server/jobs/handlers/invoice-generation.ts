import { generateInvoiceForPlan } from "@/server/services/invoice.service";

export async function handleInvoiceGenerationJob(payload: {
  orgId: string;
  paymentPlanId: string;
  periodStart: string;
  periodEnd: string;
}) {
  return generateInvoiceForPlan(payload);
}
