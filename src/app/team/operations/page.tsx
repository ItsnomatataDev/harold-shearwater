import { redirect } from "next/navigation";

export default function LegacyOperationsPage() {
  redirect("/team/schedules");
}
