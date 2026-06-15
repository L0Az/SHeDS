"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, User, ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/client-api";
import { useT } from "@/lib/i18n/context";
import { NotificationBell } from "./notification-bell";
import type { Language, UserRole } from "@/types";

interface TopbarProps {
  name: string;
  role: UserRole;
  language: Language;
  pageTitle?: string;
}

const LANG_LABELS: Record<Language, string> = { en: "EN", pt: "PT" };

export function Topbar({ name, role, language, pageTitle }: TopbarProps) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [changingLang, setChangingLang] = useState(false);

  const roleLabel: Record<UserRole, string> = {
    admin: t("role_admin"),
    technician: t("role_technician"),
    customer: t("role_customer"),
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const toggleLanguage = async () => {
    const next: Language = language === "en" ? "pt" : "en";
    setChangingLang(true);
    try {
      await api.patch("/accounts/me/", { language: next });
      router.refresh();
    } finally {
      setChangingLang(false);
      setOpen(false);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-900">{pageTitle}</h1>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="h-6 w-px bg-slate-200" />

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
              <div className="absolute right-0 top-full mt-1 z-40 w-52 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
                <button
                  onClick={toggleLanguage}
                  disabled={changingLang}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  <Globe className="h-4 w-4 text-slate-400" />
                  {t("topbar_language")}
                  <span className="ml-auto rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                    {LANG_LABELS[language]}
                  </span>
                </button>
                <div className="my-1 h-px bg-slate-100" />
                <button
                  onClick={logout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  {t("sign_out")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
