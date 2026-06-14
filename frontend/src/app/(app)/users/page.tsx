import { serverApi } from "@/lib/api";
import { UsersClient } from "./users-client";
import type { User, Department, PaginatedResponse } from "@/types";

export default async function UsersPage() {
  const [paginated, all, departments] = await Promise.all([
    serverApi.paginate<User>("/accounts/users/", 10, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<User>)
    ),
    serverApi.paginate<User>("/accounts/users/", 200, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<User>)
    ),
    serverApi.paginate<Department>("/helpdesk/departments/", 100, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<Department>)
    ),
  ]);

  return <UsersClient initialData={paginated} allUsers={all.results} departments={departments.results} />;
}
