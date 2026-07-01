import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

function isProtectedPortalPath(path: string) {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/team") ||
    path.startsWith("/agent") ||
    path.startsWith("/customer") ||
    path.startsWith("/select-access") ||
    path.startsWith("/access-pending")
  );
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: claimsData } = await supabase.auth.getClaims();
  let isAuthenticated = Boolean(claimsData?.claims?.sub);

  if (!isAuthenticated) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isAuthenticated = Boolean(user);
  }

  const needsAuthRouting =
    isProtectedPortalPath(path) ||
    path === "/auth" ||
    path === "/auth/continue" ||
    path === "/";

  if (!needsAuthRouting) {
    return response;
  }

  if (!isAuthenticated && isProtectedPortalPath(path)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth";
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    const redirect = NextResponse.redirect(loginUrl);
    copyCookies(response, redirect);
    return redirect;
  }

  if (
    isAuthenticated &&
    path === "/auth" &&
    !request.nextUrl.searchParams.has("error")
  ) {
    const continueUrl = request.nextUrl.clone();
    continueUrl.pathname = "/auth/continue";
    continueUrl.search = "";
    const redirect = NextResponse.redirect(continueUrl);
    copyCookies(response, redirect);
    return redirect;
  }

  if (isAuthenticated && path === "/") {
    const continueUrl = request.nextUrl.clone();
    continueUrl.pathname = "/auth/continue";
    continueUrl.search = "";
    const redirect = NextResponse.redirect(continueUrl);
    copyCookies(response, redirect);
    return redirect;
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
