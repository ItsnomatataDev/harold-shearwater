import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "@/lib/supabase/config";

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(
      (cookie) =>
        cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"),
    );
}

function clearSupabaseAuthCookies(
  request: NextRequest,
  response: NextResponse,
) {
  for (const cookie of request.cookies.getAll()) {
    const isSupabaseAuthCookie =
      cookie.name.startsWith("sb-") &&
      (cookie.name.includes("auth-token") ||
        cookie.name.includes("code-verifier"));

    if (isSupabaseAuthCookie) {
      response.cookies.set(cookie.name, "", {
        expires: new Date(0),
        path: "/",
      });
    }
  }
}

async function resolveAuthState(request: NextRequest, response: NextResponse) {
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user, error };
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

  const response = NextResponse.next({ request });

  if (!hasSession && protectedPath) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (hasSession) {
    const { user, error } = await resolveAuthState(request, response);

    if (error || !user) {
      clearSupabaseAuthCookies(request, response);

      if (protectedPath) {
        const loginUrl = new URL("/auth", request.url);
        loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
        return NextResponse.redirect(loginUrl, {
          headers: response.headers,
        });
      }

      if (path === "/auth") {
        return response;
      }
    }

    if (path === "/auth") {
      return NextResponse.redirect(new URL("/auth/continue", request.url), {
        headers: response.headers,
      });
    }

    return response;
  }

  return response;
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
