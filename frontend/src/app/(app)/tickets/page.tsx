import { serverApi } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { TicketsClient } from "./tickets-client";
import type { Ticket, Department, Category, PaginatedResponse } from "@/types";

export default async function TicketsPage() {
  const session = await getSession();

  const [tickets, departments, categories] = await Promise.all([
    serverApi.paginate<Ticket>("/helpdesk/tickets/", 10, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Ticket>)
    ),
    serverApi.paginate<Department>("/helpdesk/departments/", 100, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Department>)
    ),
    serverApi.paginate<Category>("/helpdesk/categories/", 100, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Category>)
    ),
  ]);

  return (
    <TicketsClient
      initialData={tickets}
      departments={departments.results}
      categories={categories.results}
      role={session?.role ?? "customer"}
    />
  );
}
