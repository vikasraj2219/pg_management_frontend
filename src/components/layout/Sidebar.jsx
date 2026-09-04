import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  FileCheck2,
  Receipt,
  Wallet,
  Wrench,
  UsersRound,
  Boxes,
  UtensilsCrossed,
  ScanFace,
  Megaphone,
  BarChart3,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Logo from "@/components/branding/Logo";

// Phase 1 ships Dashboard as a live route. Every other module is on the
// roadmap (spec sections 3-26) and shown here so the information
// architecture is visible from day one — each is disabled until its phase
// lands, so the nav won't silently 404.
const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", enabled: true },
  { label: "Properties", icon: Building2, to: "/properties", enabled: true },
  { label: "Rooms & Beds", icon: BedDouble, to: "/rooms", enabled: true },
  { label: "Tenants", icon: Users, to: "/tenants", enabled: true },
  { label: "KYC & Documents", icon: FileCheck2, to: "/documents", enabled: true },
  { label: "Billing & Ledger", icon: Receipt, to: "/billing", enabled: true },
  { label: "Payments & Deposits", icon: Wallet, to: "/payments", enabled: true },
  { label: "Expenses & Electricity", icon: Zap, to: "/expenses", enabled: true },
  { label: "Maintenance", icon: Wrench, to: "/maintenance", enabled: true },
  { label: "Staff", icon: UsersRound, to: "/staff", enabled: true },
  { label: "Inventory & Assets", icon: Boxes, to: "/assets", enabled: true },
  { label: "Food / Mess", icon: UtensilsCrossed, to: "/food", enabled: true },
  { label: "Visitors", icon: ScanFace, to: "/visitors", enabled: true },
  { label: "Notices", icon: Megaphone, to: "/notices", enabled: true },
  { label: "Reports", icon: BarChart3, to: "/reports", enabled: true },
  { label: "Audit Log", icon: ShieldCheck, to: "/audit-log", enabled: true },
  { label: "Settings", icon: Settings, to: "/settings", enabled: true },
];

export default function Sidebar({ open, onNavigate }) {
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-border bg-surface transition-transform lg:static lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <Logo className="h-8 w-8" />
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold">StayOps</p>
          <p className="text-[11px] text-muted-foreground">Hostel & PG Admin</p>
        </div>
      </div>

      <nav className="scrollbar-thin flex h-[calc(100%-4rem)] flex-col gap-0.5 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ label, icon: Icon, to, enabled }) =>
          enabled ? (
            <NavLink
              key={to}
              to={to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-foreground/80 transition-colors hover:bg-muted",
                  isActive && "bg-primary/10 text-primary"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ) : (
            <div
              key={to}
              title="Coming in a later build phase"
              className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
            >
              <Icon className="h-4 w-4" />
              {label}
              <span className="ml-auto rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-wide">
                Soon
              </span>
            </div>
          )
        )}
      </nav>
    </aside>
  );
}
