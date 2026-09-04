import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/branding/Logo";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const loggedInUser = await login(form.email, form.password);
      // platform_admin isn't scoped to an organization, so it never lands
      // on the org dashboard — send it straight to the superadmin section.
      navigate(loggedInUser?.role === "platform_admin" ? "/platform" : from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Unable to sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="bed-grid-texture absolute inset-0 opacity-30" />
        <div className="relative flex items-center gap-2">
          <Logo className="h-6 w-6" />
          <span className="font-display text-lg font-semibold">StayOps</span>
        </div>
        <div className="relative max-w-sm">
          <h1 className="font-display text-3xl font-semibold leading-tight">
            Every bed, every rupee, one dashboard.
          </h1>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Run occupancy, rent collection, and daily operations for every
            property you manage — from check-in to checkout.
          </p>
        </div>
        <p className="relative text-xs text-primary-foreground/60">Admin &amp; staff access only.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-5">
          <div className="mb-2 space-y-1 lg:hidden">
            <div className="flex items-center gap-2">
              <Logo className="h-5 w-5" />
              <span className="font-display text-lg font-semibold">StayOps</span>
            </div>
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">Access your hostel/PG admin dashboard.</p>
          </div>

          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="owner@demo.com"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Setting up for the first time?{" "}
            <Link to="/register-owner" className="font-medium text-primary hover:underline">
              Create your organization
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
