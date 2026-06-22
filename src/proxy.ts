import { NextResponse, type NextRequest } from "next/server";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
    );
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasSession = hasSupabaseSessionCookie(request);
  const protectedPath =
    path.startsWith("/admin") ||
    path.startsWith("/team") ||
    path.startsWith("/agent") ||
    path.startsWith("/customer") ||
    path.startsWith("/select-access") ||
    path.startsWith("/access-pending");

  // Fast path: avoid auth round-trips for routes that never require user state.
  if (!protectedPath && path !== "/auth") {
    return NextResponse.next({ request });
  }

  if (!hasSession && protectedPath) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession && path === "/auth") {
    return NextResponse.redirect(new URL("/auth/continue", request.url));
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|swicon.png|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
