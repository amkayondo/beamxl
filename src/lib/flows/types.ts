import type { Edge, Node, Viewport } from "@xyflow/react";

export type FlowStatus = "DRAFT" | "ACTIVE" | "PAUSED";
export type FlowNodeKind = "trigger" | "switch" | "action-enroll" | "utility-wait";
export type FlowRuntimePill = "Completed" | "Running" | "Idle";

export type TriggerType =
  | "Invoice Created"
  | "Invoice Overdue"
  | "Payment Failed"
  | "No Reply After X Days";

export type TriggerLanguage = "ANY" | "EN" | "RW" | "LG";

export type SwitchConditionField = "amount" | "days_overdue" | "tag";
export type SwitchConditionOperator = ">" | "<" | "=" | "contains";

export type SequenceName = "Nurture" | "Upsell" | "Follow-up";
export type WaitUnit = "hours" | "days";

export type RuntimeNodeChip = "Trigger" | "Condition" | "Action" | "Utility";

export type SwitchBranch = {
  id: string;
  name: string;
  condition: {
    field: SwitchConditionField;
    operator: SwitchConditionOperator;
    value: string;
  };
};

export type TriggerNodeData = {
  nodeKind: "trigger";
  chip: "Trigger";
  title: string;
  subtitle: string;
  runtime: FlowRuntimePill;
  triggerType: TriggerType;
  filters: {
    tag: string;
    language: TriggerLanguage;
  };
};

export type SwitchNodeData = {
  nodeKind: "switch";
  chip: "Condition";
  title: string;
  subtitle: string;
  runtime: FlowRuntimePill;
  branches: SwitchBranch[];
};

export type ActionEnrollNodeData = {
  nodeKind: "action-enroll";
  chip: "Action";
  title: string;
  subtitle: string;
  runtime: FlowRuntimePill;
  sequence: SequenceName;
  messagePreview: string;
};

export type WaitNodeData = {
  nodeKind: "utility-wait";
  chip: "Utility";
  title: string;
  subtitle: string;
  runtime: FlowRuntimePill;
  duration: number;
  unit: WaitUnit;
};

export type FlowNodeData = TriggerNodeData | SwitchNodeData | ActionEnrollNodeData | WaitNodeData;
export type FlowEdgeData = {
  branchId?: string;
};

export type FlowNode = Node<FlowNodeData, FlowNodeKind>;
export type FlowEdge = Edge<FlowEdgeData>;

export type FlowRecord = {
  id: string;
  orgSlug: string;
  name: string;
  status: FlowStatus;
  updatedAt: string;
  updatedBy: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
};

export type FlowStorageShape = {
  version: 1;
  orgs: Record<
    string,
    {
      flows: Record<string, FlowRecord>;
      order: string[];
    }
  >;
};

export type InspectorPatchContract = {
  updateNodeData: (nodeId: string, partialData: Partial<FlowNodeData>) => void;
  updateSwitchBranches: (nodeId: string, branches: SwitchBranch[]) => void;
};
