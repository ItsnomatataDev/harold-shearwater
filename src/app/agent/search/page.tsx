import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { getProducts } from "@/features/products/products-service";
import { AgentAvailabilitySearch } from "@/features/booking/AgentAvailabilitySearch";
import { getBookingProvider } from "@/features/booking/booking-provider";

export const metadata: Metadata = { title: "Search — Agent" };

export default async function AgentSearchPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const products = await getProducts(agent.membership.organizationId, "active");
  return <AgentAvailabilitySearch organizationId={agent.membership.organizationId} products={products} providerConfigured={getBookingProvider().configured} />;
}
