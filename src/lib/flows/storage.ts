import {
  FLOW_MOCK_EDITOR,
  FLOW_STORAGE_KEY,
  FLOW_STORAGE_VERSION,
  LEGACY_FLOW_STORAGE_KEY,
  createLocalId,
} from "@/lib/flows/mock";
import { createStarterFlow } from "@/lib/flows/starter-flow";
import type { FlowRecord, FlowStatus, FlowStorageShape } from "@/lib/flows/types";

type CreateFlowInput = {
  id?: string;
  name?: string;
  status?: FlowStatus;
  updatedBy?: string;
  nodes?: FlowRecord["nodes"];
  edges?: FlowRecord["edges"];
  viewport?: FlowRecord["viewport"];
};

function isBrowser() {
  return typeof window !== "undefined";
}

function createEmptyStorage(): FlowStorageShape {
  return {
    version: FLOW_STORAGE_VERSION,
    orgs: {},
  };
}

function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function readStorage(): FlowStorageShape {
  if (!isBrowser()) {
    return createEmptyStorage();
  }

  const raw =
    window.localStorage.getItem(FLOW_STORAGE_KEY) ??
    window.localStorage.getItem(LEGACY_FLOW_STORAGE_KEY);
  if (!raw) {
    return createEmptyStorage();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FlowStorageShape>;
    if (parsed.version !== FLOW_STORAGE_VERSION || typeof parsed.orgs !== "object" || !parsed.orgs) {
      return createEmptyStorage();
    }

    return {
      version: FLOW_STORAGE_VERSION,
      orgs: parsed.orgs,
    };
  } catch {
    return createEmptyStorage();
  }
}

function writeStorage(storage: FlowStorageShape) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(storage));
  window.localStorage.removeItem(LEGACY_FLOW_STORAGE_KEY);
}

function ensureOrgContainer(storage: FlowStorageShape, orgSlug: string) {
  if (!storage.orgs[orgSlug]) {
    storage.orgs[orgSlug] = {
      flows: {},
      order: [],
    };
  }

  return storage.orgs[orgSlug];
}

function touchFlow(flow: FlowRecord, updatedBy?: string): FlowRecord {
  return {
    ...flow,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy ?? flow.updatedBy ?? FLOW_MOCK_EDITOR,
  };
}

export function loadFlowsForOrg(orgSlug: string): FlowRecord[] {
  const storage = readStorage();
  const orgData = storage.orgs[orgSlug];
  if (!orgData) {
    return [];
  }

  const ordered = orgData.order
    .map((flowId) => orgData.flows[flowId])
    .filter((flow): flow is FlowRecord => Boolean(flow));

  const missingFromOrder = Object.values(orgData.flows).filter(
    (flow) => !orgData.order.includes(flow.id)
  );

  return [...ordered, ...missingFromOrder].map((flow) => cloneDeep(flow));
}

export function loadFlow(orgSlug: string, flowId: string): FlowRecord | null {
  const storage = readStorage();
  const flow = storage.orgs[orgSlug]?.flows[flowId];
  return flow ? cloneDeep(flow) : null;
}

export function saveFlow(flowRecord: FlowRecord): FlowRecord {
  const storage = readStorage();
  const orgData = ensureOrgContainer(storage, flowRecord.orgSlug);

  const saved = touchFlow(flowRecord);
  orgData.flows[saved.id] = cloneDeep(saved);
  if (!orgData.order.includes(saved.id)) {
    orgData.order.unshift(saved.id);
  }

  writeStorage(storage);
  return cloneDeep(saved);
}

export function deleteFlow(orgSlug: string, flowId: string) {
  const storage = readStorage();
  const orgData = storage.orgs[orgSlug];
  if (!orgData) {
    return;
  }

  delete orgData.flows[flowId];
  orgData.order = orgData.order.filter((id) => id !== flowId);
  writeStorage(storage);
}

export function duplicateFlow(orgSlug: string, flowId: string): FlowRecord | null {
  const existing = loadFlow(orgSlug, flowId);
  if (!existing) {
    return null;
  }

  const copy: FlowRecord = {
    ...existing,
    id: createLocalId("flow"),
    name: `${existing.name} (Copy)`,
    status: "DRAFT",
    orgSlug,
  };

  return saveFlow(copy);
}

export function createFlow(orgSlug: string, partial?: CreateFlowInput): FlowRecord {
  const starter = createStarterFlow({
    orgSlug,
    flowId: partial?.id,
    name: partial?.name,
    updatedBy: partial?.updatedBy,
  });

  const flow: FlowRecord = {
    ...starter,
    name: partial?.name ?? starter.name,
    status: partial?.status ?? starter.status,
    nodes: partial?.nodes ? cloneDeep(partial.nodes) : starter.nodes,
    edges: partial?.edges ? cloneDeep(partial.edges) : starter.edges,
    viewport: partial?.viewport ? cloneDeep(partial.viewport) : starter.viewport,
  };

  return saveFlow(flow);
}
