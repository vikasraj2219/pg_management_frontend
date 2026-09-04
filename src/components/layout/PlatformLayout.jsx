import { Outlet, Navigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import Logo from "@/components/branding/Logo";

// Platform superadmin isn't scoped to an organization, so it doesn't share
// the org-facing Sidebar/DashboardLayout — a small dedicated shell instead
// (spec §5.2: "a lightweight superadmin-only section").
export default function PlatformLayout() {
  const { user, logout } = useAuth();

  if (user?.role !== "platform_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex h-16 items-center gap-3 border-b border-border bg-surface px-4">
        <Logo className="h-5 w-5" />
        <span className="font-display text-sm font-semibold">StayOps Platform Admin</span>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{user?.email}</span>
          <Button variant="ghost" size="icon" onClick={logout} aria-label="Log out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <main className="p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
