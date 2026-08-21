"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrandLogo } from "@/components/brand-logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  FileTextIcon,
  SearchIcon,
  ListChecksIcon,
} from "lucide-react"

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
  { title: "Profil & CV", url: "/profile", icon: <FileTextIcon /> },
  { title: "Lowongan", url: "#", icon: <SearchIcon />, disabled: true },
  {
    title: "Pelacak Lamaran",
    url: "#",
    icon: <ListChecksIcon />,
    disabled: true,
  },
]

export function AppSidebar({
  userEmail,
  ...props
}: React.ComponentProps<typeof Sidebar> & { userEmail?: string }) {
  const pathname = usePathname()
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const items = navItems.map((item) => ({
    ...item,
    isActive: pathname === item.url,
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <BrandLogo markOnly={collapsed} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={items} />
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between gap-2 px-1 py-1">
            <span className="text-xs text-muted-foreground">Tema</span>
            <ThemeToggle />
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser
          user={{
            name: userEmail?.split("@")[0] ?? "Pengguna",
            email: userEmail ?? "",
          }}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
