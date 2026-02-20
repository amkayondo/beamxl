import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@dueflow/db";
import {
  flows,
  workflowEdges,
  workflowNodes,
  workflowVersions,
} from "@dueflow/db";

type LegacyNode = {
  id: string;
  type?: string;
  position?: { x?: number; y?: number };
  data?: {
    nodeKind?: string;
    [key: string]: unknown;
  };
};

type LegacyEdge = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
  data?: Record<string, unknown>;
};

function asObjectArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
}

async function main() {
  const allFlows = await db.query.flows.findMany({
    where: (f, { isNull }) => isNull(f.deletedAt),
    orderBy: (f, { asc }) => [asc(f.createdAt)],
  });

  let createdVersions = 0;
  let createdNodes = 0;
  let createdEdges = 0;

  for (const flow of allFlows) {
    const existingVersion = await db.query.workflowVersions.findFirst({
      where: (v, { and, eq }) => and(eq(v.orgId, flow.orgId), eq(v.flowId, flow.id)),
      orderBy: (v, { asc }) => [asc(v.versionNumber)],
    });

    let versionId = existingVersion?.id;

    if (!existingVersion) {
      versionId = crypto.randomUUID();
      await db.insert(workflowVersions).values({
        id: versionId,
        orgId: flow.orgId,
        flowId: flow.id,
        versionNumber: 1,
        nodesJson: (flow.nodesJson as Record<string, unknown>[]) ?? [],
        edgesJson: (flow.edgesJson as Record<string, unknown>[]) ?? [],
        isPublished: flow.status === "ACTIVE",
        createdByUserId: flow.updatedByUserId,
      });
      createdVersions += 1;
    }

    if (!versionId) continue;

    const existingNodeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowNodes)
      .where(eq(workflowNodes.versionId, versionId));

    if (Number(existingNodeCount[0]?.count ?? 0) === 0) {
      const legacyNodes = ((flow.nodesJson ?? []) as LegacyNode[]).filter((n) => !!n?.id);

      for (const node of legacyNodes) {
        await db.insert(workflowNodes).values({
          id: crypto.randomUUID(),
          orgId: flow.orgId,
          versionId,
          nodeKey: node.id,
          nodeType: node.type ?? node.data?.nodeKind ?? "unknown",
          positionX: Math.round(node.position?.x ?? 0),
          positionY: Math.round(node.position?.y ?? 0),
          config: (node.data ?? {}) as Record<string, unknown>,
        });
        createdNodes += 1;
      }
    }

    const existingEdgeCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(workflowEdges)
      .where(eq(workflowEdges.versionId, versionId));

    if (Number(existingEdgeCount[0]?.count ?? 0) === 0) {
      const legacyEdges = ((flow.edgesJson ?? []) as LegacyEdge[]).filter(
        (e) => !!e?.id && !!e.source && !!e.target
      );

      for (const edge of legacyEdges) {
        await db.insert(workflowEdges).values({
          id: crypto.randomUUID(),
          orgId: flow.orgId,
          versionId,
          edgeKey: edge.id,
          sourceNodeKey: edge.source,
          sourceHandle: edge.sourceHandle ?? null,
          targetNodeKey: edge.target,
          targetHandle: edge.targetHandle ?? null,
          conditionRef: (edge.data ?? {}) as Record<string, unknown>,
        });
        createdEdges += 1;
      }
    }
  }

  console.log(
    `[backfill:hydrate-workflow-versions] flows=${allFlows.length} createdVersions=${createdVersions} createdNodes=${createdNodes} createdEdges=${createdEdges}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("[backfill:hydrate-workflow-versions] failed", error);
    process.exit(1);
  });
