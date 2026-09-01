import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  Building2,
  GitCompareArrows,
  LayoutDashboard,
  Library,
  Lightbulb,
  Pickaxe,
  Radar,
  Settings,
  ShieldCheck,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Marca a rota como ativa também para subrotas. */
  matchPrefix?: boolean;
  badge?: "monitoring";
}

export interface NavSection {
  title: string | null;
  items: NavItem[];
  adminOnly?: boolean;
}

export const NAV_SECTIONS: NavSection[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/mine", label: "Minerar", icon: Pickaxe },
    ],
  },
  {
    title: "Descobertas",
    items: [
      { href: "/offers", label: "Ofertas", icon: Boxes, matchPrefix: true },
      { href: "/advertisers", label: "Anunciantes", icon: Building2, matchPrefix: true },
      { href: "/library", label: "Biblioteca", icon: Library, matchPrefix: true },
    ],
  },
  {
    title: "Inteligência",
    items: [
      { href: "/insights", label: "Insights", icon: Lightbulb, matchPrefix: true },
      { href: "/compare", label: "Comparador", icon: GitCompareArrows },
      {
        href: "/monitoring",
        label: "Monitoramento",
        icon: Radar,
        matchPrefix: true,
        badge: "monitoring",
      },
    ],
  },
  {
    title: "Conta",
    items: [{ href: "/settings", label: "Configurações", icon: Settings, matchPrefix: true }],
  },
  {
    title: "Plataforma",
    adminOnly: true,
    items: [{ href: "/admin", label: "Administração", icon: ShieldCheck, matchPrefix: true }],
  },
];

export function isActive(pathname: string, item: NavItem): boolean {
  return item.matchPrefix ? pathname.startsWith(item.href) : pathname === item.href;
}
