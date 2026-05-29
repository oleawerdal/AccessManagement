import { ShieldCheck } from "lucide-react";

import { ResetPasswordForm } from "@/components/forms/reset-password-form";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Sett nytt passord</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Velg et passord på minst 8 tegn.
          </p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <ResetPasswordForm token={searchParams.token ?? ""} />
        </div>
      </div>
    </main>
  );
}
