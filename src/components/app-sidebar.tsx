"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3Icon,
  BellIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  GitBranchIcon,
  LayoutDashboardIcon,
  MessageSquareIcon,
  PhoneIcon,
  Settings2Icon,
  ShieldIcon,
  UsersIcon,
  WorkflowIcon,
  ZapIcon,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

type OrgItem = {
  orgId: string
  slug: string
  name: string
}

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  orgSlug: string
  orgs: OrgItem[]
}

export function AppSidebar({ orgSlug, orgs, ...props }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const navMain = [
    {
      title: "Overview",
      url: `/${orgSlug}/overview`,
      icon: <LayoutDashboardIcon />,
      isActive: isActive(`/${orgSlug}/overview`),
    },
    {
      title: "Contacts",
      url: `/${orgSlug}/contacts`,
      icon: <UsersIcon />,
      isActive: isActive(`/${orgSlug}/contacts`),
    },
    {
      title: "Plans",
      url: `/${orgSlug}/plans`,
      icon: <CreditCardIcon />,
      isActive: isActive(`/${orgSlug}/plans`),
    },
    {
      title: "Invoices",
      url: `/${orgSlug}/invoices`,
      icon: <FileTextIcon />,
      isActive: isActive(`/${orgSlug}/invoices`),
    },
    {
      title: "Conversations",
      url: `/${orgSlug}/conversations`,
      icon: <MessageSquareIcon />,
      isActive: isActive(`/${orgSlug}/conversations`),
    },
    {
      title: "Flows",
      url: `/${orgSlug}/flows`,
      icon: <GitBranchIcon />,
      isActive: isActive(`/${orgSlug}/flows`),
    },
    {
      title: "Automation",
      url: `/${orgSlug}/automation`,
      icon: <ZapIcon />,
      isActive: isActive(`/${orgSlug}/automation`),
    },
    {
      title: "Templates",
      url: `/${orgSlug}/templates`,
      icon: <WorkflowIcon />,
      isActive: isActive(`/${orgSlug}/templates`),
    },
  ]

  const navSecondary = [
    {
      title: "Calls",
      url: `/${orgSlug}/calls`,
      icon: <PhoneIcon />,
    },
    {
      title: "Reports",
      url: `/${orgSlug}/reports`,
      icon: <BarChart3Icon />,
    },
    {
      title: "Audit Logs",
      url: `/${orgSlug}/audit-logs`,
      icon: <ClipboardListIcon />,
    },
    {
      title: "Settings",
      url: `/${orgSlug}/settings`,
      icon: <Settings2Icon />,
    },
    {
      title: "Compliance",
      url: `/${orgSlug}/settings/compliance`,
      icon: <ShieldIcon />,
    },
  ]

  const teams = orgs.map((org) => ({
    name: org.name,
    slug: org.slug,
    logo: <BellIcon className="size-3.5" />,
    plan: "Collections OS",
  }))

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} currentSlug={orgSlug} />
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
