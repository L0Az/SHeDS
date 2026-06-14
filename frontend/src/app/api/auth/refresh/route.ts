import { getRefreshToken, setAuthCookies } from "@/lib/auth";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://localhost:9000";

export async function POST() {
  const refresh = await getRefreshToken();
  if (!refresh) {
    return Response.json({ detail: "No refresh token." }, { status: 401 });
  }

  const res = await fetch(`${DJANGO_URL}/v1/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    return Response.json({ detail: "Token refresh failed." }, { status: 401 });
  }

  const { access } = await res.json();
  await setAuthCookies(access, refresh);

  return Response.json({ ok: true }, { status: 200 });
}
