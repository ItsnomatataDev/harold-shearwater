"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Supabase invite/recovery emails use the implicit flow: they redirect to an
 * arbitrary page with the tokens in the URL hash (e.g. `#access_token=...&type=invite`).
 * Left alone, the browser client would silently sign the user in on whatever
 * page they landed on. This handler intercepts that hash on any page, persists
 * the session, strips the hash, and routes the user into the correct flow:
 *   - type=invite   -> /auth/accept-invitation (set password + accept)
 *   - type=recovery -> /auth/update-password
 */
export function InviteHashHandler() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");
    if (!accessToken || !refreshToken) return;

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) return;

      // Remove the sensitive tokens from the URL bar.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      const destination =
        type === "recovery"
          ? "/auth/update-password"
          : type === "invite"
            ? "/auth/accept-invitation"
            : "/auth/continue";

      router.replace(destination);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
