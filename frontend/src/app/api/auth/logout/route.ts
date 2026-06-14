import { clearAuthCookies } from "@/lib/auth";

export async function POST() {
  await clearAuthCookies();
  return Response.json({ ok: true }, { status: 200 });
}
