"use client";

import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n/context";
import type { TicketPriority, TicketStatus } from "@/types";

const variants = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-amber-100 text-amber-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  purple: "bg-purple-100 text-purple-700",
  outline: "border border-slate-300 text-slate-600",
} as const;

type BadgeVariant = keyof typeof variants;

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const t = useT();
  const map: Record<TicketStatus, BadgeVariant> = {
    open: "info",
    in_progress: "warning",
    in_development: "purple",
    closed: "default",
  };
  const labels: Record<TicketStatus, ReturnType<typeof t>> = {
    open: t("status_open"),
    in_progress: t("status_in_progress"),
    in_development: t("status_in_development"),
    closed: t("status_closed"),
  };
  return <Badge variant={map[status]}>{labels[status]}</Badge>;
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const t = useT();
  const map: Record<TicketPriority, BadgeVariant> = {
    high: "danger",
    medium: "warning",
    low: "success",
  };
  const labels: Record<TicketPriority, ReturnType<typeof t>> = {
    high: t("priority_high"),
    medium: t("priority_medium"),
    low: t("priority_low"),
  };
  return <Badge variant={map[priority]}>{labels[priority]}</Badge>;
}

export function RoleBadge({ role }: { role: string }) {
  const t = useT();
  const variantMap: Record<string, BadgeVariant> = {
    admin: "purple",
    technician: "info",
    customer: "default",
  };
  const labelMap: Record<string, string> = {
    admin: t("role_admin"),
    technician: t("role_technician"),
    customer: t("role_customer"),
  };
  return (
    <Badge variant={variantMap[role] ?? "default"}>
      {labelMap[role] ?? role}
    </Badge>
  );
}
