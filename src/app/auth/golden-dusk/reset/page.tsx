import { Suspense } from "react";
import { GoldenDuskResetPasswordForm } from "@/features/agent/golden-dusk/GoldenDuskResetPasswordForm";

export const metadata = { title: "Reset GoldenDusk password" };

export default function GoldenDuskResetPasswordPage() {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4 py-12">
      <Suspense>
        <GoldenDuskResetPasswordForm />
      </Suspense>
    </div>
  );
}
