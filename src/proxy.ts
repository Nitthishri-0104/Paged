import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/jwt";

// Runs on the Edge runtime, so it can only use the pure JWT helpers (no
// `next/headers`, no Prisma/Node APIs). It never trusts the token's contents
// for authorization decisions beyond "is someone logged in" — every API
// route re-verifies the session and re-checks ownership independently.

const PUBLIC_APP_ROUTES = ["/login", "/signup"];

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

function isPublicApiRoute(pathname: string): boolean {
  return (
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/signin") ||
    pathname.startsWith("/api/auth/me")
  );
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (isApiRoute(pathname)) {
    if (!session && !isPublicApiRoute(pathname)) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.next();
  }

  const isPublicPage = PUBLIC_APP_ROUTES.some((route) => pathname.startsWith(route));

  if (!session && !isPublicPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session && isPublicPage) {
    return NextResponse.redirect(new URL("/notes", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
