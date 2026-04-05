import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

type SessionPayload = {
  id: string;
  name: string;
  email: string;
  role: string;
};

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "aioms_session";

const PUBLIC_PATHS = ["/", "/products", "/order", "/track-order", "/about", "/announcements", "/contact", "/payment", "/aggregator"];
const DASHBOARD_PATH = "/dashboard";
const LOGIN_PATH = "/login";
const RESET_PASSWORD_PATH = "/reset-password";

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isApiPublicPath(pathname: string) {
  return (
    pathname.startsWith("/api/public") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname) || isApiPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    if (pathname === LOGIN_PATH) return NextResponse.next();
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  let session: SessionPayload | null = null;
  try {
    const { payload } = await jwtVerify(token, secret);
    session = payload as unknown as SessionPayload;
  } catch {
    const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  if (pathname === LOGIN_PATH) {
    return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
  }

  if (pathname === RESET_PASSWORD_PATH) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-session-user-id", session.id);
  requestHeaders.set("x-session-role", session.role);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
