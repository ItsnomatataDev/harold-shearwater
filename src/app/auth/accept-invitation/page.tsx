import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AcceptInvitationPanel } from "@/features/auth/components/AcceptInvitationPanel";

export default async function AcceptInvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams; if (!token) redirect("/auth?error=invitation");
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/auth/accept-invitation?token=${token}`)}`);
  return <main className="grid min-h-screen place-items-center bg-[#111] px-5"><AcceptInvitationPanel token={token} email={user.email ?? "your account"}/></main>;
}
