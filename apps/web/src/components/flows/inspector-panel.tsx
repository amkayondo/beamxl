"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CONDITION_FIELD_OPTIONS,
  CONDITION_OPERATOR_OPTIONS,
  SEQUENCE_OPTIONS,
  TRIGGER_LANGUAGE_OPTIONS,
  TRIGGER_TYPE_OPTIONS,
  WAIT_UNIT_OPTIONS,
} from "@/lib/flows/mock";
import { createSwitchBranch } from "@/lib/flows/node-factory";
import type { FlowNode, SwitchBranch } from "@/lib/flows/types";

type InspectorPanelProps = {
  node: FlowNode | null;
  updateNodeData: (nodeId: string, partialData: Record<string, unknown>) => void;
  updateSwitchBranches: (nodeId: string, branches: SwitchBranch[]) => void;
};

type SwitchBranchPatch = Partial<Omit<SwitchBranch, "condition">> & {
  condition?: Partial<SwitchBranch["condition"]>;
};

export function InspectorPanel({ node, updateNodeData, updateSwitchBranches }: InspectorPanelProps) {
  if (!node) {
    return (
      <aside className="rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Inspector</p>
        <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-8 text-center text-sm text-zinc-500">
          Select a node to edit its settings.
        </div>
      </aside>
    );
  }

  const activeNode = node;
  const triggerData = activeNode.data.nodeKind === "trigger" ? activeNode.data : null;
  const switchData = activeNode.data.nodeKind === "switch" ? activeNode.data : null;
  const actionData = activeNode.data.nodeKind === "action-enroll" ? activeNode.data : null;
  const waitData = activeNode.data.nodeKind === "utility-wait" ? activeNode.data : null;

  function patchBranch(index: number, partial: SwitchBranchPatch) {
    if (!switchData) return;

    const next = [...switchData.branches];
    const existing = next[index];
    if (!existing) return;

    next[index] = {
      ...existing,
      ...partial,
      condition: partial.condition
        ? {
            ...existing.condition,
            ...partial.condition,
          }
        : existing.condition,
    };

    updateSwitchBranches(activeNode.id, next);
  }

  function moveBranch(index: number, direction: -1 | 1) {
    if (!switchData) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= switchData.branches.length) return;

    const next = [...switchData.branches];
    const current = next[index];
    next[index] = next[nextIndex] as SwitchBranch;
    next[nextIndex] = current as SwitchBranch;
    updateSwitchBranches(activeNode.id, next);
  }

  function removeBranch(index: number) {
    if (!switchData) return;
    if (switchData.branches.length === 1) return;

    const next = switchData.branches.filter((_, itemIndex) => itemIndex !== index);
    updateSwitchBranches(activeNode.id, next);
  }

  function addBranch() {
    if (!switchData) return;

    const branchIndex = switchData.branches.length + 1;
    updateSwitchBranches(activeNode.id, [
      ...switchData.branches,
      createSwitchBranch(`Branch ${branchIndex}`),
    ]);
  }

  return (
    <aside className="h-full rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Inspector</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs text-zinc-500">Node</p>
          <p className="text-sm font-medium text-zinc-100">{activeNode.data.title}</p>
        </div>

        {triggerData ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Trigger type</p>
              <Select
                value={triggerData.triggerType}
                onChange={(event) =>
                  updateNodeData(activeNode.id, { triggerType: event.target.value })
                }
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              >
                {TRIGGER_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Tag filter</p>
              <Input
                value={triggerData.filters.tag}
                onChange={(event) =>
                  updateNodeData(activeNode.id, {
                    filters: {
                      ...triggerData.filters,
                      tag: event.target.value,
                    },
                  })
                }
                placeholder="vip"
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Language filter</p>
              <Select
                value={triggerData.filters.language}
                onChange={(event) =>
                  updateNodeData(activeNode.id, {
                    filters: {
                      ...triggerData.filters,
                      language: event.target.value,
                    },
                  })
                }
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              >
                {TRIGGER_LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        ) : null}

        {switchData ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-500">Branches</p>
              <Button type="button" size="sm" variant="outline" onClick={addBranch} className="h-7 px-2 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add branch
              </Button>
            </div>

            <div className="space-y-3">
              {switchData.branches.map((branch, index) => (
                <div key={branch.id} className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                  <div className="flex items-center gap-2">
                    <Input
                      value={branch.name}
                      onChange={(event) => patchBranch(index, { name: event.target.value })}
                      className="h-8 border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => moveBranch(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => moveBranch(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-300"
                      onClick={() => removeBranch(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <Select
                      value={branch.condition.field}
                      onChange={(event) =>
                        patchBranch(index, {
                          condition: {
                            ...branch.condition,
                            field: event.target.value as SwitchBranch["condition"]["field"],
                          },
                        })
                      }
                      className="h-8 border-zinc-800 bg-zinc-950 text-zinc-100"
                    >
                      {CONDITION_FIELD_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                    <Select
                      value={branch.condition.operator}
                      onChange={(event) =>
                        patchBranch(index, {
                          condition: {
                            ...branch.condition,
                            operator: event.target.value as SwitchBranch["condition"]["operator"],
                          },
                        })
                      }
                      className="h-8 border-zinc-800 bg-zinc-950 text-zinc-100"
                    >
                      {CONDITION_OPERATOR_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </Select>
                    <Input
                      value={branch.condition.value}
                      onChange={(event) =>
                        patchBranch(index, {
                          condition: {
                            ...branch.condition,
                            value: event.target.value,
                          },
                        })
                      }
                      placeholder="Value"
                      className="h-8 border-zinc-800 bg-zinc-950 text-zinc-100"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {actionData ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Sequence</p>
              <Select
                value={actionData.sequence}
                onChange={(event) => {
                  const sequence = event.target.value;
                  updateNodeData(activeNode.id, {
                    sequence,
                    subtitle: `Enroll contact in '${sequence}' sequence.`,
                  });
                }}
                className="border-zinc-800 bg-zinc-900 text-zinc-100"
              >
                {SEQUENCE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Message preview</p>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-3 text-xs text-zinc-300">
                {actionData.messagePreview}
              </div>
            </div>
          </div>
        ) : null}

        {waitData ? (
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Duration</p>
                <Input
                  min={1}
                  type="number"
                  value={waitData.duration}
                  onChange={(event) => {
                    const parsed = Number(event.target.value || 0);
                    updateNodeData(activeNode.id, {
                      duration: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
                    });
                  }}
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs text-zinc-500">Unit</p>
                <Select
                  value={waitData.unit}
                  onChange={(event) => updateNodeData(activeNode.id, { unit: event.target.value })}
                  className="border-zinc-800 bg-zinc-900 text-zinc-100"
                >
                  {WAIT_UNIT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
