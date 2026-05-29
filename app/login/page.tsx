import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { isEntraEnabled } from "@/lib/sso-config";
import { LoginForm } from "@/components/forms/login-form";
import { entraSignInAction } from "./actions";
import { Button } from "@/components/ui/button";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const entraEnabled = await isEntraEnabled();

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Tilgangsstyring
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Logg inn for å dokumentere systemtilganger.
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <LoginForm />

          {entraEnabled && (
            <>
              <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                eller
                <span className="h-px flex-1 bg-border" />
              </div>
              <form action={entraSignInAction}>
                <Button type="submit" variant="outline" className="w-full">
                  Logg inn med Microsoft
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Internt verktøy. All aktivitet logges.
        </p>
      </div>
    </main>
  );
}
