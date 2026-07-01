import { Suspense } from "react";
import { GoldenDuskActivateAccountForm } from "@/features/agent/golden-dusk/GoldenDuskActivateAccountForm";

export const metadata = { title: "Activate GoldenDusk account" };

export default function GoldenDuskActivateAccountPage() {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense>
        <GoldenDuskActivateAccountForm />
      </Suspense>
    </div>
  );
}
