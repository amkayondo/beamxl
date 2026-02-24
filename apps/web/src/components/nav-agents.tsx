"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArchiveIcon,
  BotIcon,
  ChevronRightIcon,
  FolderIcon,
  ListFilterIcon,
  PinIcon,
  SquarePenIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentTask = {
  id: string
  /** Short description of the task */
  title: string
  /** Human-readable elapsed time, e.g. "2h", "1d", "3w" */
  timeAgo: string
  isPinned?: boolean
  isActive?: boolean
  url?: string
}

export type Agent = {
  id: string
  /** Agent / campaign name */
  name: string
  /** Optional context label shown muted beside the name (e.g. client name) */
  context?: string
  /** Tasks the agent has run or is running */
  tasks: AgentTask[]
  /** Link to agent detail page */
  url?: string
}

// ─── Sample data — swap for real tRPC query ───────────────────────────────────

export const SAMPLE_AGENTS: Agent[] = [
  {
    id: "a1",
    name: "Payment reminders",
    context: "acme-corp",
    tasks: [
      {
        id: "t1",
        title: "Send overdue notice to 42 contacts",
        timeAgo: "2h",
        isActive: true,
        url: "#",
      },
      { id: "t2", title: "Follow-up call sequence", timeAgo: "1d", url: "#" },
    ],
    url: "#",
  },
  {
    id: "a2",
    name: "Dispute resolution",
    context: "globex",
    tasks: [
      {
        id: "t3",
        title: "Review 3 open disputes",
        timeAgo: "14h",
        isPinned: true,
        url: "#",
      },
      {
        id: "t4",
        title: "Escalate unresolved to legal",
        timeAgo: "2d",
        url: "#",
      },
    ],
    url: "#",
  },
  {
    id: "a3",
    name: "Failed payment retry",
    tasks: [
      {
        id: "t5",
        title: "Retry 8 failed card charges",
        timeAgo: "just now",
        url: "#",
      },
      {
        id: "t6",
        title: "Notify contacts of retry attempt",
        timeAgo: "30m",
        url: "#",
      },
    ],
    url: "#",
  },
  {
    id: "a4",
    name: "Outbound call campaign",
    context: "initech",
    tasks: [
      { id: "t8", title: "Dial 15 high-priority debtors", timeAgo: "3d", url: "#" },
    ],
    url: "#",
  },
]

// ─── Task row ─────────────────────────────────────────────────────────────────

function TaskItem({ task }: { task: AgentTask }) {
  const [hovered, setHovered] = React.useState(false)
  const href = task.url ?? "#"

  return (
    <SidebarMenuItem>
      <Link
        href={href}
        className={cn(
          "flex min-h-8 w-full items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          task.isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
        )}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Pin icon — slides in on hover or always visible when pinned */}
        <span
          className={cn(
            "shrink-0 transition-all duration-100",
            hovered || task.isPinned ? "w-3.5 opacity-100" : "w-0 opacity-0 overflow-hidden"
          )}
        >
          <PinIcon
            className={cn(
              "size-3.5",
              task.isPinned ? "text-foreground" : "text-muted-foreground rotate-45"
            )}
          />
        </span>

        {/* Title */}
        <span className="flex-1 truncate">{task.title}</span>

        {/* Right: archive on hover, timestamp otherwise */}
        {hovered ? (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              // TODO: archive mutation
            }}
            className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            title="Archive task"
          >
            <ArchiveIcon className="size-3.5" />
          </button>
        ) : (
          <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
            {task.timeAgo}
          </span>
        )}
      </Link>
    </SidebarMenuItem>
  )
}

// ─── Agent group (folder) ─────────────────────────────────────────────────────

function AgentGroup({ agent }: { agent: Agent }) {
  return (
    <div className="mb-2 last:mb-0">
      {/* Agent header */}
      <Link
        href={agent.url ?? "#"}
        className="mb-0.5 flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
      >
        <FolderIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{agent.name}</span>
        {agent.context && (
          <span className="truncate text-xs text-muted-foreground font-normal">
            {agent.context}
          </span>
        )}
      </Link>

      {/* Tasks indented under agent */}
      <SidebarMenu className="pl-3.5 border-l border-border/50 ml-4">
        {agent.tasks.map((task) => (
          <TaskItem key={task.id} task={task} />
        ))}
      </SidebarMenu>
    </div>
  )
}

// ─── Nav section ──────────────────────────────────────────────────────────────

export function NavAgents({
  agents,
  orgSlug,
}: {
  agents: Agent[]
  orgSlug: string
}) {
  const activeCount = agents.reduce(
    (n, a) => n + a.tasks.filter((t) => t.isActive).length,
    0
  )

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden px-0">
      {/* Header */}
      <SidebarGroupLabel className="flex items-center justify-between px-2 pr-1">
        <span className="flex items-center gap-1.5">
          <BotIcon className="size-3.5" />
          Agents
          {activeCount > 0 && (
            <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-500/15 px-1 text-[10px] font-semibold tabular-nums text-blue-500">
              {activeCount}
            </span>
          )}
        </span>
        <div className="flex items-center gap-0.5">
          <Link
            href={`/${orgSlug}/agents`}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="Filter agents"
          >
            <ListFilterIcon className="size-3.5" />
          </Link>
          <Link
            href={`/${orgSlug}/agents/new`}
            className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
            title="New agent"
          >
            <SquarePenIcon className="size-3.5" />
          </Link>
        </div>
      </SidebarGroupLabel>

      {/* Agent list */}
      <div className="mt-1 px-2">
        {agents.length === 0 ? (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            No agents yet.
          </p>
        ) : (
          agents.map((agent) => <AgentGroup key={agent.id} agent={agent} />)
        )}
      </div>
    </SidebarGroup>
  )
}
