"use client";

import { useMemo, useState, type DragEvent } from "react";
import { ChevronDown, ChevronRight, Clock3, GitBranch, Search, Send, Sparkles } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  FLOW_NODE_DND_MIME,
  PALETTE_ITEMS,
  type PaletteCategory,
} from "@/lib/flows/node-factory";
import type { FlowNodeKind } from "@/lib/flows/types";
import { cn } from "@/lib/utils";

const categories: PaletteCategory[] = ["Triggers", "Conditions", "Actions", "Utilities"];

function getPaletteIcon(icon: (typeof PALETTE_ITEMS)[number]["icon"]) {
  switch (icon) {
    case "sparkles":
      return Sparkles;
    case "split":
      return GitBranch;
    case "send":
      return Send;
    case "clock3":
      return Clock3;
  }
}

export function NodePalette() {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<PaletteCategory, boolean>>({
    Triggers: false,
    Conditions: false,
    Actions: false,
    Utilities: false,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return PALETTE_ITEMS;
    }

    return PALETTE_ITEMS.filter((item) => {
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.keywords.some((keyword) => keyword.includes(q))
      );
    });
  }, [query]);

  const grouped = useMemo(() => {
    return categories.map((category) => ({
      category,
      items: filtered.filter((item) => item.category === category),
    }));
  }, [filtered]);

  function onDragStart(event: DragEvent<HTMLDivElement>, kind: FlowNodeKind) {
    event.dataTransfer.setData(FLOW_NODE_DND_MIME, kind);
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Node Palette</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes"
            className="border-zinc-800 bg-zinc-900 pl-9 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
      </div>

      <div className="mt-4 space-y-3 overflow-y-auto pr-1">
        {grouped.map((group) => {
          const isCollapsed = collapsed[group.category];

          return (
            <div key={group.category} className="rounded-xl border border-zinc-800/80 bg-zinc-900/30">
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({
                    ...prev,
                    [group.category]: !prev[group.category],
                  }))
                }
                className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-zinc-200"
              >
                <span>{group.category}</span>
                {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {!isCollapsed ? (
                <div className="space-y-2 px-2 pb-2">
                  {group.items.length ? (
                    group.items.map((item) => {
                      const Icon = getPaletteIcon(item.icon);

                      return (
                        <div
                          key={item.kind}
                          draggable
                          onDragStart={(event) => onDragStart(event, item.kind)}
                          className={cn(
                            "cursor-grab rounded-lg border border-zinc-800 bg-zinc-950/70 p-3 transition-all hover:border-zinc-700 hover:bg-zinc-900",
                            "active:cursor-grabbing"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="rounded-md border border-zinc-700/70 bg-zinc-800/80 p-1.5 text-zinc-200">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                              <p className="mt-1 text-xs text-zinc-400">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="rounded-md bg-zinc-950/70 px-3 py-2 text-xs text-zinc-500">No nodes match this search.</p>
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
