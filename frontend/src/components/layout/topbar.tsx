"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface TopbarProps {
  name: string;
  role: UserRole;
  pageTitle?: string;
}

export function Topbar({ name, role, pageTitle }: TopbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const roleLabel: Record<UserRole, string> = {
    admin: "Administrator",
    technician: "Technician",
    customer: "Customer",
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>

      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs text-slate-500 mt-0.5">{roleLabel[role]}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition-transform", open && "rotate-180")} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
              <button
                onClick={logout}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
