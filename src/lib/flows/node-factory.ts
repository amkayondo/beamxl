import type { XYPosition } from "@xyflow/react";

import { createLocalId } from "@/lib/flows/mock";
import type {
  ActionEnrollNodeData,
  FlowNode,
  FlowNodeData,
  FlowNodeKind,
  SwitchBranch,
  TriggerNodeData,
  WaitNodeData,
} from "@/lib/flows/types";

export type PaletteCategory = "Triggers" | "Conditions" | "Actions" | "Utilities";

export type PaletteItem = {
  kind: FlowNodeKind;
  category: PaletteCategory;
  icon: "sparkles" | "split" | "send" | "clock3";
  title: string;
  description: string;
  keywords: string[];
};

export const FLOW_NODE_DND_MIME = "application/beamflow-node-kind";

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    kind: "trigger",
    category: "Triggers",
    icon: "sparkles",
    title: "When Invoice Updated",
    description: "Trigger when invoice status changes.",
    keywords: ["trigger", "invoice", "status"],
  },
  {
    kind: "switch",
    category: "Conditions",
    icon: "split",
    title: "Switch",
    description: "Route based on branch conditions.",
    keywords: ["switch", "condition", "branch"],
  },
  {
    kind: "action-enroll",
    category: "Actions",
    icon: "send",
    title: "Enroll in sequence",
    description: "Enroll a contact in a sequence.",
    keywords: ["action", "sequence", "enroll"],
  },
  {
    kind: "utility-wait",
    category: "Utilities",
    icon: "clock3",
    title: "Wait",
    description: "Pause before the next step.",
    keywords: ["utility", "wait", "delay"],
  },
];

export function createSwitchBranch(name: string): SwitchBranch {
  return {
    id: createLocalId("branch"),
    name,
    condition: {
      field: "tag",
      operator: "contains",
      value: "",
    },
  };
}

export function createDefaultNodeData(kind: FlowNodeKind): FlowNodeData {
  switch (kind) {
    case "trigger": {
      const data: TriggerNodeData = {
        nodeKind: "trigger",
        chip: "Trigger",
        title: "When Invoice Updated",
        subtitle: "Trigger when invoice status changes.",
        runtime: "Idle",
        triggerType: "Invoice Overdue",
        filters: {
          tag: "",
          language: "ANY",
        },
      };
      return data;
    }
    case "switch": {
      return {
        nodeKind: "switch",
        chip: "Condition",
        title: "Switch",
        subtitle: "Route based on conditions.",
        runtime: "Idle",
        branches: [createSwitchBranch("Branch 1"), createSwitchBranch("Branch 2")],
      };
    }
    case "action-enroll": {
      const data: ActionEnrollNodeData = {
        nodeKind: "action-enroll",
        chip: "Action",
        title: "Enroll in sequence",
        subtitle: "Enroll contact in 'Follow-up' sequence.",
        runtime: "Idle",
        sequence: "Follow-up",
        messagePreview: "We'll follow up with a tailored sequence for this contact.",
      };
      return data;
    }
    case "utility-wait": {
      const data: WaitNodeData = {
        nodeKind: "utility-wait",
        chip: "Utility",
        title: "Wait",
        subtitle: "Pause for 2 days.",
        runtime: "Idle",
        duration: 2,
        unit: "days",
      };
      return data;
    }
  }
}

export function createNodeFromPalette(kind: FlowNodeKind, position: XYPosition): FlowNode {
  return {
    id: createLocalId("node"),
    type: kind,
    position,
    data: createDefaultNodeData(kind),
  };
}
