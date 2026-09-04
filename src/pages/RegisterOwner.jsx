import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "@/components/branding/Logo";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterOwner() {
  const { registerOwner } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    organizationName: "",
    name: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerOwner(form);
      navigate("/onboarding/billing", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not create your organization.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <span className="font-display text-lg font-semibold">StayOps</span>
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold">Set up your organization</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This creates your organization and the first owner account. Do this once.
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="organizationName">Organization / business name</Label>
          <Input id="organizationName" required value={form.organizationName} onChange={update("organizationName")} placeholder="Sunrise PG Group" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" required value={form.name} onChange={update("name")} placeholder="Ananya Rao" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={update("phone")} placeholder="98765 43210" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={form.email} onChange={update("email")} placeholder="you@company.com" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required minLength={8} value={form.password} onChange={update("password")} placeholder="At least 8 characters" />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create organization"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Already set up?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
