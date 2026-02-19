"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3Icon,
  ClipboardListIcon,
  FileTextIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PhoneIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
  ZapIcon,
  CreditCardIcon,
  WorkflowIcon,
  BuildingIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

type Org = { orgId: string; slug: string; name: string }
type User = { name: string; email: string; image?: string | null }

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  orgSlug: string
  orgs: Org[]
  user: User
}

export function AppSidebar({ orgSlug, orgs, user, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")

  const navMain = [
    {
      title: "Receivables",
      url: `/${orgSlug}/overview`,
      icon: <LayoutDashboardIcon />,
      isActive:
        isActive(`/${orgSlug}/overview`) ||
        isActive(`/${orgSlug}/contacts`) ||
        isActive(`/${orgSlug}/invoices`) ||
        isActive(`/${orgSlug}/plans`),
      items: [
        { title: "Overview", url: `/${orgSlug}/overview` },
        { title: "Contacts", url: `/${orgSlug}/contacts` },
        { title: "Invoices", url: `/${orgSlug}/invoices` },
        { title: "Plans", url: `/${orgSlug}/plans` },
      ],
    },
    {
      title: "Communication",
      url: `/${orgSlug}/conversations`,
      icon: <MessageSquareIcon />,
      isActive:
        isActive(`/${orgSlug}/conversations`) ||
        isActive(`/${orgSlug}/calls`) ||
        isActive(`/${orgSlug}/templates`),
      items: [
        { title: "Conversations", url: `/${orgSlug}/conversations` },
        { title: "Calls", url: `/${orgSlug}/calls` },
        { title: "Templates", url: `/${orgSlug}/templates` },
      ],
    },
    {
      title: "Automation",
      url: `/${orgSlug}/flows`,
      icon: <ZapIcon />,
      isActive:
        isActive(`/${orgSlug}/flows`) ||
        isActive(`/${orgSlug}/automation`),
      items: [
        { title: "Flows", url: `/${orgSlug}/flows` },
        { title: "Rules", url: `/${orgSlug}/automation` },
      ],
    },
    {
      title: "Settings",
      url: `/${orgSlug}/settings`,
      icon: <Settings2Icon />,
      isActive:
        isActive(`/${orgSlug}/settings`),
      items: [
        { title: "General", url: `/${orgSlug}/settings` },
        { title: "Compliance", url: `/${orgSlug}/settings/compliance` },
      ],
    },
  ]

  const navTools = [
    {
      name: "Reports",
      url: `/${orgSlug}/reports`,
      icon: <BarChart3Icon />,
    },
    {
      name: "Audit Logs",
      url: `/${orgSlug}/audit-logs`,
      icon: <ClipboardListIcon />,
    },
  ]

  const teams = orgs.map((org) => ({
    name: org.name,
    slug: org.slug,
    logo: <BuildingIcon className="size-4" />,
    plan: "Collections OS",
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} currentSlug={orgSlug} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={navTools} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user.name,
            email: user.email,
            avatar: user.image ?? "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
