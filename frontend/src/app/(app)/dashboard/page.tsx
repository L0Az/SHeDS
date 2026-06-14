import { serverApi } from "@/lib/api";
import { StatCard } from "@/components/ui/card";
import { Table, TableHead, TableBody, TableRow, Th, Td } from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Ticket, TicketCheck, Clock, CheckCircle2, Wrench } from "lucide-react";
import Link from "next/link";
import type { Ticket as TicketType, PaginatedResponse } from "@/types";

export default async function DashboardPage() {
  const data = await serverApi
    .paginate<TicketType>("/helpdesk/tickets/", 50, 0)
    .catch(() => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<TicketType>));

  const tickets = data.results;
  const open = tickets.filter((t) => t.status === "open").length;
  const inProgress = tickets.filter((t) => t.status === "in_progress").length;
  const inDev = tickets.filter((t) => t.status === "in_development").length;
  const closed = tickets.filter((t) => t.status === "closed").length;

  const recent = tickets.slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-1">Overview of your helpdesk activity</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Open" value={open} icon={Ticket} color="indigo" />
        <StatCard label="In Progress" value={inProgress} icon={Clock} color="amber" />
        <StatCard label="In Development" value={inDev} icon={Wrench} color="purple" />
        <StatCard label="Closed" value={closed} icon={CheckCircle2} color="emerald" />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Recent Tickets</h3>
          <Link href="/tickets" className="text-sm text-indigo-600 hover:underline">
            View all →
          </Link>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <Th className="w-16">#</Th>
              <Th>Title</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
              <Th>Created</Th>
            </TableRow>
          </TableHead>
          <TableBody>
            {recent.length === 0 && (
              <TableRow>
                <Td className="text-center text-slate-400 py-8" colSpan={99}>
                  No tickets yet
                </Td>
              </TableRow>
            )}
            {recent.map((t) => (
              <TableRow key={t.id}>
                <Td className="font-mono text-slate-400">#{t.id}</Td>
                <Td>
                  <Link href={`/tickets/${t.id}`} className="font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                    {t.title}
                  </Link>
                </Td>
                <Td><PriorityBadge priority={t.priority} /></Td>
                <Td><StatusBadge status={t.status} /></Td>
                <Td className="text-slate-500">{formatDate(t.created_at)}</Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
