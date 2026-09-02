import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

export default function Settings() {
  const [tab, setTab] = useState("organization");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Organization, property, and dashboard user settings.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: "organization", label: "Organization" },
          { id: "properties", label: "Property settings" },
          { id: "users", label: "Users" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "organization" && <OrganizationTab />}
      {tab === "properties" && <PropertiesTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

function OrganizationTab() {
  const queryClient = useQueryClient();
  const { data: org, isLoading } = useQuery({
    queryKey: ["organization"],
    queryFn: async () => (await api.get("/organization")).data.data,
  });
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");

  const current = form || org;

  const mutation = useMutation({
    mutationFn: async () => (await api.put("/organization", current)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organization"] });
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not save settings"),
  });

  if (isLoading || !current) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4 pt-5">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="space-y-1.5">
          <Label>Organization name</Label>
          <Input value={current.name || ""} onChange={(e) => setForm({ ...current, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Contact email</Label>
            <Input value={current.contactEmail || ""} onChange={(e) => setForm({ ...current, contactEmail: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Contact phone</Label>
            <Input value={current.contactPhone || ""} onChange={(e) => setForm({ ...current, contactPhone: e.target.value })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input value={current.address || ""} onChange={(e) => setForm({ ...current, address: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Currency</Label>
            <Input value={current.currency || ""} onChange={(e) => setForm({ ...current, currency: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Date format</Label>
            <Select value={current.dateFormat || "DD/MM/YYYY"} onChange={(e) => setForm({ ...current, dateFormat: e.target.value })}>
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </Select>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!current.notificationsEnabled} onChange={(e) => setForm({ ...current, notificationsEnabled: e.target.checked })} />
          Enable notifications
        </label>

        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? "Saving…" : "Save changes"}
        </Button>
      </CardContent>
    </Card>
  );
}

function PropertiesTab() {
  const queryClient = useQueryClient();
  const [activeProperty, setActiveProperty] = useState(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  return (
    <div className="space-y-2">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        properties?.map((p) => (
          <Card key={p._id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveProperty(p)}>
            <CardContent className="flex items-center justify-between py-3.5">
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                Billing day {p.settings?.billingDate ?? 1} · Late fee ₹{p.settings?.lateFeeAmount ?? 0} · ₹{p.settings?.electricityRatePerUnit ?? 0}/unit
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {activeProperty && (
        <PropertySettingsDialog
          property={activeProperty}
          onClose={() => setActiveProperty(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["properties"] })}
        />
      )}
    </div>
  );
}

function PropertySettingsDialog({ property, onClose, onSaved }) {
  const [settings, setSettings] = useState({
    billingDate: property.settings?.billingDate ?? 1,
    lateFeeAmount: property.settings?.lateFeeAmount ?? 0,
    electricityRatePerUnit: property.settings?.electricityRatePerUnit ?? 0,
    depositMonths: property.settings?.depositMonths ?? 2,
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.put(`/properties/${property._id}`, { settings })).data.data,
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not save settings"),
  });

  return (
    <Dialog open onClose={onClose} title={`${property.name} — settings`}>
      <div className="space-y-4">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Billing date (day of month)</Label>
            <Input type="number" min={1} max={28} value={settings.billingDate} onChange={(e) => setSettings({ ...settings, billingDate: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Late fee (₹)</Label>
            <Input type="number" min={0} value={settings.lateFeeAmount} onChange={(e) => setSettings({ ...settings, lateFeeAmount: Number(e.target.value) })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Electricity rate (₹/unit)</Label>
            <Input type="number" min={0} value={settings.electricityRatePerUnit} onChange={(e) => setSettings({ ...settings, electricityRatePerUnit: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Deposit rule (months' rent)</Label>
            <Input type="number" min={0} value={settings.depositMonths} onChange={(e) => setSettings({ ...settings, depositMonths: Number(e.target.value) })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

const DASHBOARD_ROLES = ["owner", "manager", "warden", "accountant", "receptionist", "security", "maintenance", "housekeeping"];

function UsersTab() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["dashboard-users"],
    queryFn: async () => (await api.get("/users")).data.data,
  });

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => (await api.put(`/users/${id}`, { status })).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-users"] }),
  });

  if (currentUser?.role !== "owner") {
    return <p className="text-sm text-muted-foreground">Only the account owner can manage dashboard users.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-2">
          {users?.map((u) => (
            <Card key={u._id}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {u.email} · {u.propertyAccess?.length ? u.propertyAccess.map((p) => p.name).join(", ") : "All properties"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="primary">{u.role}</Badge>
                  <Badge tone={u.status === "active" ? "success" : "default"}>{u.status}</Badge>
                  {u._id !== currentUser._id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleStatusMutation.mutate({ id: u._id, status: u.status === "active" ? "inactive" : "active" })}
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddUserDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        properties={properties}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["dashboard-users"] })}
      />
    </div>
  );
}

function AddUserDialog({ open, onClose, properties, onAdded }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", role: "manager" });
  const [propertyIds, setPropertyIds] = useState([]);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/users", { ...form, propertyAccess: propertyIds })).data.data,
    onSuccess: () => {
      onAdded();
      onClose();
      setForm({ name: "", email: "", phone: "", password: "", role: "manager" });
      setPropertyIds([]);
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add user"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Add dashboard user">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {DASHBOARD_ROLES.filter((r) => r !== "owner").map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Password</Label>
          <Input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>Property access (none checked = all properties)</Label>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border border-border p-2">
            {properties?.map((p) => (
              <label key={p._id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                <input
                  type="checkbox"
                  checked={propertyIds.includes(p._id)}
                  onChange={(e) => setPropertyIds(e.target.checked ? [...propertyIds, p._id] : propertyIds.filter((id) => id !== p._id))}
                />
                {p.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add user"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
