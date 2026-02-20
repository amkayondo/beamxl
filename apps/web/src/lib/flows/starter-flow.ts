import { createLocalId, FLOW_MOCK_EDITOR } from "@/lib/flows/mock";
import type { FlowRecord, SwitchBranch } from "@/lib/flows/types";

type StarterFlowOptions = {
  orgSlug: string;
  flowId?: string;
  name?: string;
  updatedBy?: string;
};

export function createStarterFlow(options: StarterFlowOptions): FlowRecord {
  const nurtureBranch: SwitchBranch = {
    id: "branch-nurture",
    name: "Nurture",
    condition: {
      field: "days_overdue",
      operator: "<",
      value: "7",
    },
  };

  const upsellBranch: SwitchBranch = {
    id: "branch-upsell",
    name: "Upsell",
    condition: {
      field: "amount",
      operator: ">",
      value: "5000",
    },
  };

  const now = new Date().toISOString();

  return {
    id: options.flowId ?? createLocalId("flow"),
    orgSlug: options.orgSlug,
    name: options.name ?? "Invoice Follow-up Flow",
    status: "DRAFT",
    updatedAt: now,
    updatedBy: options.updatedBy ?? FLOW_MOCK_EDITOR,
    viewport: {
      x: 0,
      y: 0,
      zoom: 0.9,
    },
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 80, y: 180 },
        data: {
          nodeKind: "trigger",
          chip: "Trigger",
          title: "When Invoice Updated",
          subtitle: "Trigger when invoice status changes.",
          runtime: "Completed",
          triggerType: "Invoice Overdue",
          filters: {
            tag: "",
            language: "ANY",
          },
        },
      },
      {
        id: "switch-1",
        type: "switch",
        position: { x: 400, y: 165 },
        data: {
          nodeKind: "switch",
          chip: "Condition",
          title: "Switch",
          subtitle: "Route based on conditions.",
          runtime: "Completed",
          branches: [nurtureBranch, upsellBranch],
        },
      },
      {
        id: "action-nurture-1",
        type: "action-enroll",
        position: { x: 760, y: 70 },
        data: {
          nodeKind: "action-enroll",
          chip: "Action",
          title: "Enroll in sequence",
          subtitle: "Enroll contact in 'Nurture' sequence.",
          runtime: "Idle",
          sequence: "Nurture",
          messagePreview: "Send a soft sequence focused on payment reminders.",
        },
      },
      {
        id: "action-upsell-1",
        type: "action-enroll",
        position: { x: 760, y: 275 },
        data: {
          nodeKind: "action-enroll",
          chip: "Action",
          title: "Enroll in sequence",
          subtitle: "Enroll contact in 'Upsell' sequence.",
          runtime: "Running",
          sequence: "Upsell",
          messagePreview: "Send a high-touch sequence for larger outstanding balances.",
        },
      },
    ],
    edges: [
      {
        id: "edge-trigger-switch",
        source: "trigger-1",
        target: "switch-1",
        type: "labeled",
      },
      {
        id: "edge-switch-nurture",
        source: "switch-1",
        sourceHandle: nurtureBranch.id,
        target: "action-nurture-1",
        type: "labeled",
        label: nurtureBranch.name,
        data: {
          branchId: nurtureBranch.id,
        },
      },
      {
        id: "edge-switch-upsell",
        source: "switch-1",
        sourceHandle: upsellBranch.id,
        target: "action-upsell-1",
        type: "labeled",
        label: upsellBranch.name,
        data: {
          branchId: upsellBranch.id,
        },
      },
    ],
  };
}
