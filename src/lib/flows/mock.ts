import type {
  FlowNodeKind,
  FlowRuntimePill,
  FlowStatus,
  SequenceName,
  SwitchConditionField,
  SwitchConditionOperator,
  TriggerLanguage,
  TriggerType,
} from "@/lib/flows/types";

export const FLOW_STORAGE_KEY = "beamflow_flows";
export const FLOW_STORAGE_VERSION = 1;
export const FLOW_MOCK_EDITOR = "You";

export const FLOW_FILTERS: Array<{ label: string; value: "ALL" | FlowStatus }> = [
  { label: "All", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Active", value: "ACTIVE" },
  { label: "Paused", value: "PAUSED" },
];

export const TRIGGER_TYPE_OPTIONS: TriggerType[] = [
  "Invoice Created",
  "Invoice Overdue",
  "Payment Failed",
  "No Reply After X Days",
];

export const TRIGGER_LANGUAGE_OPTIONS: TriggerLanguage[] = ["ANY", "EN", "RW", "LG"];

export const CONDITION_FIELD_OPTIONS: SwitchConditionField[] = ["amount", "days_overdue", "tag"];

export const CONDITION_OPERATOR_OPTIONS: SwitchConditionOperator[] = [">", "<", "=", "contains"];

export const SEQUENCE_OPTIONS: SequenceName[] = ["Nurture", "Upsell", "Follow-up"];

export const WAIT_UNIT_OPTIONS = ["hours", "days"] as const;

export const NODE_CHIP_CLASS: Record<FlowNodeKind, string> = {
  trigger: "bg-sky-500/10 text-sky-200 border border-sky-300/20",
  switch: "bg-violet-500/10 text-violet-200 border border-violet-300/20",
  "action-enroll": "bg-cyan-500/10 text-cyan-200 border border-cyan-300/20",
  "utility-wait": "bg-zinc-500/10 text-zinc-200 border border-zinc-300/20",
};

export const RUNTIME_PILL_CLASS: Record<FlowRuntimePill, string> = {
  Completed: "bg-emerald-500/15 text-emerald-200 border border-emerald-300/20",
  Running: "bg-blue-500/15 text-blue-200 border border-blue-300/20",
  Idle: "bg-zinc-500/15 text-zinc-200 border border-zinc-300/20",
};

export function createLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  const fallback = Math.random().toString(36).slice(2, 11);
  return `${prefix}-${fallback}`;
}

export function formatRelativeTime(iso: string) {
  const now = Date.now();
  const updated = new Date(iso).getTime();
  if (Number.isNaN(updated)) return "Unknown";

  const diffMs = now - updated;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(iso).toLocaleDateString();
}
