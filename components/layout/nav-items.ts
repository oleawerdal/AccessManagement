import {
  LayoutDashboard,
  Users,
  Server,
  Boxes,
  Grid3x3,
  ScrollText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, only ADMIN may see this item. */
  adminOnly?: boolean;
};

export const navItems: NavItem[] = [
  { label: "Oversikt", href: "/dashboard", icon: LayoutDashboard },
  { label: "Personer", href: "/dashboard/persons", icon: Users },
  { label: "Systemer", href: "/dashboard/systems", icon: Server },
  { label: "Grupper", href: "/dashboard/groups", icon: Boxes },
  { label: "Matrise", href: "/dashboard/matrix", icon: Grid3x3 },
  { label: "Revisjonslogg", href: "/dashboard/audit", icon: ScrollText },
  {
    label: "Innstillinger",
    href: "/dashboard/settings",
    icon: Settings,
    adminOnly: true,
  },
];
