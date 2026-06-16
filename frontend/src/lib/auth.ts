import { cookies } from "next/headers";
import type { JwtPayload } from "@/types";

export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    const decoded = Buffer.from(payload, "base64url").toString("utf-8");
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  const store = await cookies();
  const token = store.get("access_token")?.value;
  if (!token) return null;

  const payload = decodeJwt(token);
  if (!payload) return null;

  if (payload.exp * 1000 < Date.now()) return null;

  return payload;
}

export async function setAuthCookies(
  access: string,
  refresh: string
): Promise<void> {
  const accessPayload = decodeJwt(access);
  const refreshPayload = decodeJwt(refresh);

  const store = await cookies();

  store.set("access_token", access, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: accessPayload ? accessPayload.exp - Math.floor(Date.now() / 1000) : 3600,
  });

  store.set("refresh_token", refresh, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: refreshPayload
      ? refreshPayload.exp - Math.floor(Date.now() / 1000)
      : 604800,
  });
}

export async function clearAuthCookies(): Promise<void> {
  const store = await cookies();
  store.delete("access_token");
  store.delete("refresh_token");
}

export async function getRefreshToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get("refresh_token")?.value;
}
