import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { CustomerShell } from "@/layouts/CustomerShell";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");
  return <CustomerShell name={customer.context.fullName}>{children}</CustomerShell>;
}
