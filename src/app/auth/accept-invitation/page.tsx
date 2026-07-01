import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TeamInvitationAcceptPanel } from "@/features/auth/components/TeamInvitationAcceptPanel";
import {
  getTeamInvitationByToken,
  getPendingInvitationForCurrentUser,
} from "@/features/auth/services/invitation-service";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Token link (shared/copied) takes priority when present.
  let invitation = token ? await getTeamInvitationByToken(token) : null;

  // Otherwise, resolve a pending invitation from the signed-in user's metadata
  // (this is how Supabase invite emails arrive — session first, no raw token).
  if (!invitation) {
    invitation = await getPendingInvitationForCurrentUser();
  }

  if (!invitation) {
    redirect("/auth?error=invitation-expired");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#111] px-5 py-12">
      <TeamInvitationAcceptPanel
        token={token ?? null}
        invitation={invitation}
        signedInEmail={user?.email ?? null}
      />
    </main>
  );
}
