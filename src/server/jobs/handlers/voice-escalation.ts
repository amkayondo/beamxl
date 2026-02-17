export async function handleVoiceEscalationJob(payload: {
  orgId: string;
  invoiceId: string;
}) {
  return {
    skipped: true,
    reason: "Phase 2 feature disabled",
    payload,
  };
}
