import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const protectedPath =
    path.startsWith("/team") ||
    path.startsWith("/agent") ||
    path.startsWith("/customer") ||
    path.startsWith("/select-access") ||
    path.startsWith("/access-pending");
  if (!user && protectedPath) {
    const loginUrl = new URL("/auth", request.url);
    loginUrl.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (user && path === "/auth")
    return NextResponse.redirect(new URL("/auth/continue", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|swicon.png|favicon.ico).*)"],
};
