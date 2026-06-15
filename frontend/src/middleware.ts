import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/setup", "/api/auth/login", "/api/auth/bootstrap", "/api/auth/refresh"];
const DJANGO_URL = process.env.DJANGO_INTERNAL_URL ?? "http://localhost:9000";

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function parseJwtExp(token: string): number | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  if (accessToken) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // No access token — attempt silent refresh before sending to login
  const refreshToken = request.cookies.get("refresh_token")?.value;
  if (refreshToken) {
    try {
      const res = await fetch(`${DJANGO_URL}/v1/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (res.ok) {
        const { access } = await res.json() as { access: string };
        const exp = parseJwtExp(access);
        const response = NextResponse.redirect(request.url);
        response.cookies.set("access_token", access, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: exp ? exp - Math.floor(Date.now() / 1000) : 3600,
        });
        return response;
      }
    } catch {
      // Refresh failed — fall through to login redirect
    }
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
