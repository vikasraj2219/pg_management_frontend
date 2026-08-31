import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UsersRound, Plus, Phone, Mail } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

const ROLES = ["Manager", "Warden", "Accountant", "Receptionist", "Security", "Maintenance", "Housekeeping"];

export default function Staff() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: staff, isLoading } = useQuery({
    queryKey: ["staff-directory", propertyFilter, roleFilter],
    queryFn: async () =>
      (await api.get("/staff", { params: { property: propertyFilter || undefined, role: roleFilter || undefined } })).data.data,
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id) => (await api.delete(`/staff/${id}`)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["staff-directory"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Staff</h1>
          <p className="text-sm text-muted-foreground">Everyone working across your properties.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add staff
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select className="w-48" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">All properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select className="w-44" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : staff?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <UsersRound className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No staff added yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staff?.map((s) => (
            <Card key={s._id}>
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.property?.name}</p>
                  </div>
                  <Badge tone={s.status === "active" ? "success" : "default"}>{s.status}</Badge>
                </div>
                <Badge tone="primary">{s.role}</Badge>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  {s.phone}
                </p>
                {s.email && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" />
                    {s.email}
                  </p>
                )}
                {s.status === "active" && (
                  <Button variant="ghost" size="sm" className="mt-1 text-danger" onClick={() => deactivateMutation.mutate(s._id)}>
                    Mark inactive
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddStaffDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        properties={properties}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["staff-directory"] })}
      />
    </div>
  );
}

function AddStaffDialog({ open, onClose, properties, onAdded }) {
  const [form, setForm] = useState({ property: "", name: "", phone: "", email: "", role: "Housekeeping", joiningDate: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/staff", form)).data.data,
    onSuccess: () => {
      onAdded();
      onClose();
      setForm({ property: "", name: "", phone: "", email: "", role: "Housekeeping", joiningDate: "" });
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add staff member"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Add staff member">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="space-y-1.5">
          <Label>Property</Label>
          <Select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
            <option value="">Select property…</option>
            {properties?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Joining date</Label>
          <Input type="date" value={form.joiningDate} onChange={(e) => setForm({ ...form, joiningDate: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add staff"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
