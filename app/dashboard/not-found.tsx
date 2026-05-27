import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <FileQuestion className="h-6 w-6" />
      </div>
      <h1 className="text-lg font-semibold">Ikke funnet</h1>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Ressursen du leter etter finnes ikke, eller har blitt slettet.
      </p>
      <Button asChild className="mt-4" variant="outline">
        <Link href="/dashboard">Til oversikten</Link>
      </Button>
    </div>
  );
}
