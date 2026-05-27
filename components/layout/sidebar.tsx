"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { AdminRole } from "@prisma/client";

import { cn } from "@/lib/utils";
import { navItems } from "./nav-items";

export function Sidebar({ role }: { role: AdminRole }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold tracking-tight">
          Tilgangsstyring
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 p-2" aria-label="Hovednavigasjon">
        {navItems
          .filter((item) => !item.adminOnly || role === "ADMIN")
          .map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>

      <div className="border-t p-3 text-xs text-muted-foreground">
        <span
          className={cn(
            "inline-flex items-center rounded px-1.5 py-0.5 font-medium",
            role === "ADMIN"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {role === "ADMIN" ? "Administrator" : "Revisor (lesetilgang)"}
        </span>
      </div>
    </aside>
  );
}
