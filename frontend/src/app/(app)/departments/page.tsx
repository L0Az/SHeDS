import { serverApi } from "@/lib/api";
import { DepartmentsClient } from "./departments-client";
import type { Department, PaginatedResponse } from "@/types";

export default async function DepartmentsPage() {
  const data = await serverApi
    .paginate<Department>("/helpdesk/departments/", 10, 0)
    .catch(() => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Department>));

  return <DepartmentsClient initialData={data} />;
}
