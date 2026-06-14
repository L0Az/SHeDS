import { serverApi } from "@/lib/api";
import { UsersClient } from "./users-client";
import type { User, PaginatedResponse } from "@/types";

export default async function UsersPage() {
  const [paginated, all] = await Promise.all([
    serverApi.paginate<User>("/accounts/users/", 10, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<User>)
    ),
    serverApi.paginate<User>("/accounts/users/", 200, 0).catch(
      () => ({ count: 0, results: [], next: null, previous: null } as PaginatedResponse<User>)
    ),
  ]);

  return <UsersClient initialData={paginated} allUsers={all.results} />;
}
