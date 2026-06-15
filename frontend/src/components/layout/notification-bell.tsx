"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import { api } from "@/lib/client-api";
import type { PaginatedResponse, UserNotification } from "@/types";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = () => {
    api
      .get<PaginatedResponse<UserNotification>>("/accounts/notifications/", { limit: 30 })
      .then((res) => setNotifications(res.results))
      .catch(() => {});
  };

  const markRead = async (id: number) => {
    await api.patch(`/accounts/notifications/${id}/read/`, {}).catch(() => {});
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
  };

  const markAllRead = async () => {
    await api.post("/accounts/notifications/read-all/", {}).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const handleNotificationClick = async (n: UserNotification) => {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    if (n.ticket) router.push(`/tickets/${n.ticket}`);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-1 z-40 w-80 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="text-sm font-semibold text-slate-800">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                >
                  <Check className="h-3 w-3" /> Mark all read
                </button>
              )}
            </div>

            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <li className="px-4 py-8 text-center text-sm text-slate-400">No notifications</li>
              ) : (
                notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleNotificationClick(n)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors",
                        !n.read_at && "bg-indigo-50/60",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read_at && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                        )}
                        <div className={cn("flex-1 min-w-0", n.read_at && "pl-4")}>
                          <p className="text-sm text-slate-800 leading-snug">{n.content}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{formatDateTime(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
