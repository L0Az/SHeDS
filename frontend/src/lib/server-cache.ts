import { cache } from "react";
import { serverApi } from "@/lib/api";
import type { AppConfig, PublicAppConfig, User } from "@/types";

export const getCachedMe = cache(() =>
  serverApi.get<User>("/accounts/me/").catch(() => null)
);

export const getCachedAppConfig = cache(() =>
  serverApi.get<AppConfig>("/settings/app/").catch(() => null)
);

export const getCachedPublicConfig = cache(() =>
  serverApi.get<PublicAppConfig>("/settings/public/").catch(() => null)
);
