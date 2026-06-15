import { serverApi } from "@/lib/api";
import { getCachedMe } from "@/lib/server-cache";
import { getT } from "@/lib/i18n/translations";
import { StatCard } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Ticket, Clock, CheckCircle2, Wrench } from "lucide-react";
import Link from "next/link";
import type { Ticket as TicketType, PaginatedResponse } from "@/types";

export default async function DashboardPage() {
  const me = await getCachedMe();
  const t = getT(me?.language ?? "en");

  const data = await serverApi
    .paginate<TicketType>("/helpdesk/tickets/", 50, 0)
    .catch(() => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<TicketType>));

  const tickets = data.results;
  const open = tickets.filter((tk) => tk.status === "open").length;
  const inProgress = tickets.filter((tk) => tk.status === "in_progress").length;
  const inDev = tickets.filter((tk) => tk.status === "in_development").length;
  const closed = tickets.filter((tk) => tk.status === "closed").length;

  const recent = tickets.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{t("dashboard_title")}</h2>
        <p className="text-sm text-slate-500 mt-1">{t("dashboard_subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("status_open")} value={open} icon={Ticket} color="indigo" />
        <StatCard label={t("status_in_progress")} value={inProgress} icon={Clock} color="amber" />
        <StatCard label={t("status_in_development")} value={inDev} icon={Wrench} color="purple" />
        <StatCard label={t("status_closed")} value={closed} icon={CheckCircle2} color="emerald" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{t("dashboard_recent")}</h3>
          <Link href="/tickets" className="text-sm text-indigo-600 hover:underline">
            {t("dashboard_view_all")}
          </Link>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <Th className="w-16">#</Th>
              <Th>{t("title")}</Th>
              <Th>{t("priority")}</Th>
              <Th>{t("status")}</Th>
              <Th>{t("created")}</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {recent.length === 0 && (
              <TableRow>
                <Td className="text-center text-slate-400 py-8" colSpan={99}>
                  {t("dashboard_no_tickets")}
                </Td>
              </TableRow>
            )}
            {recent.map((tk) => (
              <TableRow key={tk.id}>
                <Td className="font-mono text-slate-400">#{tk.id}</Td>
                <Td>
                  <Link href={`/tickets/${tk.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                    {tk.title}
                  </Link>
                </Td>
                <Td><PriorityBadge priority={tk.priority} /></Td>
                <Td><StatusBadge status={tk.status} /></Td>
                <Td className="text-slate-500">{formatDate(tk.created_at)}</Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
