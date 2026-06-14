import { setAuthCookies } from "@/lib/auth";
import type { AuthTokens } from "@/types";

const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://localhost:9000";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return Response.json({ detail: "Email and password are required." }, { status: 400 });
  }

  const res = await fetch(`${DJANGO_URL}/v1/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed." }));
    return Response.json(err, { status: res.status });
  }

  const tokens: AuthTokens = await res.json();
  await setAuthCookies(tokens.access, tokens.refresh);

  return Response.json({ ok: true }, { status: 200 });
}
