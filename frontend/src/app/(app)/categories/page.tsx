import { serverApi } from "@/lib/api";
import { CategoriesClient } from "./categories-client";
import type { Category, Department, PaginatedResponse } from "@/types";

export default async function CategoriesPage() {
  const [data, departments] = await Promise.all([
    serverApi.paginate<Category>("/helpdesk/categories/", 10, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Category>)
    ),
    serverApi.paginate<Department>("/helpdesk/departments/", 100, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Department>)
    ),
  ]);

  return <CategoriesClient initialData={data} departments={departments.results} />;
}
