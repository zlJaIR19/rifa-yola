import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { copy } from "@/lib/copy";

// Optimistic check: every API route also verifies the session itself.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const valid = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login") {
    if (valid) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: copy.errors.unauthorized }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except the login API, Next internals and static files.
  matcher: ["/((?!api/login|_next/static|_next/image|favicon.ico|icon.svg|logo-yoli.png|.*\\.(?:png|svg|ico|webmanifest)$).*)"],
};
