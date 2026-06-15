"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Ticket,
  Building2,
  Tag,
  Users,
  Settings,
  Headset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { TranslationKey } from "@/lib/i18n/translations";
import type { UserRole } from "@/types";

interface NavItem {
  href: string;
  labelKey: TranslationKey;
  icon: React.ElementType;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard",   labelKey: "nav_dashboard",   icon: LayoutDashboard, roles: ["admin", "technician", "customer"] },
  { href: "/tickets",     labelKey: "nav_tickets",     icon: Ticket,          roles: ["admin", "technician", "customer"] },
  { href: "/departments", labelKey: "nav_departments", icon: Building2,       roles: ["admin", "technician"] },
  { href: "/categories",  labelKey: "nav_categories",  icon: Tag,             roles: ["admin", "technician"] },
  { href: "/users",       labelKey: "nav_users",       icon: Users,           roles: ["admin"] },
  { href: "/settings",    labelKey: "nav_settings",    icon: Settings,        roles: ["admin"] },
];

interface SidebarProps {
  role: UserRole;
  appName: string;
}

export function Sidebar({ role, appName }: SidebarProps) {
  const pathname = usePathname();
  const t = useT();

  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="flex h-screen w-64 flex-col" style={{ backgroundColor: "var(--sidebar-bg)" }}>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-slate-700/50">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
          <Headset className="h-4 w-4 text-white" />
        </div>
        <span className="font-semibold text-white truncate">{appName}</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {items.map(({ href, labelKey, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-3 py-3 border-t border-slate-700/50">
        <p className="px-3 text-xs text-slate-600">v1.0</p>
      </div>
    </aside>
  );
}
