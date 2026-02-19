import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { NODE_CHIP_CLASS, RUNTIME_PILL_CLASS } from "@/lib/flows/mock";
import type { SwitchNodeData } from "@/lib/flows/types";
import { cn } from "@/lib/utils";

export function SwitchNode({ data: rawData, selected }: NodeProps) {
  const data = rawData as SwitchNodeData;

  return (
    <div className={cn("flow-node w-[280px]", selected && "flow-node-selected")}> 
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-zinc-700/70 bg-zinc-800/80 p-2 text-zinc-200">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">{data.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{data.subtitle}</p>
          </div>
        </div>
        <Badge className={cn("text-[11px]", RUNTIME_PILL_CLASS[data.runtime])}>{data.runtime}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <Badge className={cn("text-[11px]", NODE_CHIP_CLASS.switch)}>{data.chip}</Badge>
        <p className="text-xs text-zinc-400">{data.branches.length} branch(es)</p>
      </div>

      <div className="mt-3 space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-2">
        {data.branches.map((branch) => (
          <div key={branch.id} className="flex items-center justify-between text-xs text-zinc-300">
            <span>{branch.name}</span>
            <span className="text-zinc-500">{branch.condition.field}</span>
          </div>
        ))}
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-violet-300"
      />

      {data.branches.map((branch, index) => {
        const top = 66 + index * 34;
        return (
          <Handle
            key={branch.id}
            id={branch.id}
            type="source"
            position={Position.Right}
            style={{ top }}
            className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-violet-300"
          />
        );
      })}
    </div>
  );
}
