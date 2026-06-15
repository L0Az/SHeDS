import { notFound } from "next/navigation";
import { serverApi } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { TicketDetailClient } from "./ticket-detail-client";
import type { Assignee, Ticket, Department, Category, PaginatedResponse } from "@/types";

interface Params {
  params: Promise<{ id: string }>;
}

const EMPTY_PAGE = { results: [] } as unknown as PaginatedResponse<never>;

export default async function TicketDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await getSession();

  const [ticket, departments, categories, assignees] = await Promise.all([
    serverApi.get<Ticket>(`/helpdesk/tickets/${id}/`).catch(() => null),
    serverApi.paginate<Department>("/helpdesk/departments/", 100, 0).catch(() => EMPTY_PAGE),
    serverApi.paginate<Category>("/helpdesk/categories/", 100, 0).catch(() => EMPTY_PAGE),
    serverApi.paginate<Assignee>("/helpdesk/assignees/", 100, 0).catch(() => EMPTY_PAGE),
  ]);

  if (!ticket) notFound();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900 line-clamp-1">{ticket.title}</h2>
      </div>
      <TicketDetailClient
        ticket={ticket}
        departments={departments.results as Department[]}
        categories={categories.results as Category[]}
        assignees={assignees.results as Assignee[]}
        role={session?.role ?? "customer"}
        userId={session?.user_id ?? 0}
      />
    </div>
  );
}
