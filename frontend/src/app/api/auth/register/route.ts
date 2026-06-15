import { setAuthCookies } from "@/lib/auth";
import type { AuthTokens } from "@/types";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://localhost:9000";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ detail: "Invalid body." }, { status: 400 });
  }

  const res = await fetch(`${DJANGO_URL}/v1/auth/register/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed." }));
    return Response.json(err, { status: res.status });
  }

  const tokens: AuthTokens = await res.json();
  await setAuthCookies(tokens.access, tokens.refresh);

  return Response.json({ ok: true }, { status: 201 });
}
