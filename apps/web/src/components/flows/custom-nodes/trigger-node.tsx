import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bolt } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { NODE_CHIP_CLASS, RUNTIME_PILL_CLASS } from "@/lib/flows/mock";
import type { TriggerNodeData } from "@/lib/flows/types";
import { cn } from "@/lib/utils";

export function TriggerNode({ data: rawData, selected }: NodeProps) {
  const data = rawData as TriggerNodeData;

  return (
    <div className={cn("flow-node w-[260px]", selected && "flow-node-selected")}> 
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-lg border border-zinc-700/70 bg-zinc-800/80 p-2 text-zinc-200">
            <Bolt className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-100">{data.title}</p>
            <p className="mt-1 text-xs text-zinc-400">{data.subtitle}</p>
          </div>
        </div>
        <Badge className={cn("text-[11px]", RUNTIME_PILL_CLASS[data.runtime])}>{data.runtime}</Badge>
      </div>

      <div className="mt-3">
        <Badge className={cn("text-[11px]", NODE_CHIP_CLASS.trigger)}>{data.chip}</Badge>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-zinc-950 !bg-sky-300"
      />
    </div>
  );
}
