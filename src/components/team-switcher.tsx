"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChevronDownIcon } from "lucide-react"

type Team = {
  name: string
  logo: React.ReactNode
  plan: string
  slug?: string
}

export function TeamSwitcher({
  teams,
  currentSlug,
}: {
  teams: Team[]
  currentSlug?: string
}) {
  const router = useRouter()
  const [activeTeam, setActiveTeam] = React.useState<Team>(
    () => teams.find((t) => t.slug === currentSlug) ?? teams[0]!
  )

  if (!activeTeam) return null

  const handleSelect = (team: Team) => {
    setActiveTeam(team)
    if (team.slug) {
      router.push(`/${team.slug}/overview`)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="w-fit px-1.5">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-5 items-center justify-center rounded-md">
                {activeTeam.logo}
              </div>
              <div className="flex flex-col items-start text-left leading-none">
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  BeamFlow
                </span>
                <span className="truncate font-semibold">{activeTeam.name}</span>
              </div>
              <ChevronDownIcon className="ml-auto opacity-50" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {teams.map((team, index) => (
              <DropdownMenuItem
                key={team.slug ?? team.name}
                onClick={() => handleSelect(team)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-xs border">
                  {team.logo}
                </div>
                {team.name}
                <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
