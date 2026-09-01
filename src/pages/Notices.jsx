import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const SCOPE_LABELS = {
  all_tenants: "All tenants",
  property: "Property",
  floor: "Floor",
  room: "Room",
  selected_tenants: "Selected tenants",
};

export default function Notices() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const { data: notices, isLoading } = useQuery({
    queryKey: ["notices"],
    queryFn: async () => (await api.get("/notices")).data.data,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => (await api.delete(`/notices/${id}`)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notices"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Notices</h1>
          <p className="text-sm text-muted-foreground">Announcements for tenants, by property, floor, room, or hand-picked recipients.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          New notice
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : notices?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notices posted yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notices?.map((n) => (
            <Card key={n._id}>
              <CardContent className="space-y-1.5 py-4">
                <div className="flex items-start justify-between">
                  <p className="font-medium">{n.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge tone="primary">{SCOPE_LABELS[n.scope]}</Badge>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(n._id)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground">
                  {n.property?.name}
                  {n.floor ? ` · ${n.floor.name}` : ""}
                  {n.room ? ` · Room ${n.room.roomNumber}` : ""} ·{" "}
                  {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewNoticeDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["notices"] })}
      />
    </div>
  );
}

function NewNoticeDialog({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", message: "", scope: "all_tenants", property: "", floor: "", room: "" });
  const [tenantIds, setTenantIds] = useState("");
  const [error, setError] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
    enabled: open,
  });

  const { data: floors } = useQuery({
    queryKey: ["floors-for-notice", form.property],
    queryFn: async () => {
      const buildings = (await api.get(`/properties/${form.property}/buildings`)).data.data;
      const all = await Promise.all(buildings.map((b) => api.get(`/buildings/${b._id}/floors`)));
      return all.flatMap((r) => r.data.data);
    },
    enabled: open && form.scope === "floor" && !!form.property,
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms-for-notice", form.property],
    queryFn: async () => (await api.get(`/properties/${form.property}/rooms`)).data.data,
    enabled: open && form.scope === "room" && !!form.property,
  });

  const { data: tenants } = useQuery({
    queryKey: ["tenants-for-notice"],
    queryFn: async () => (await api.get("/tenants", { params: { limit: 200 } })).data.data,
    enabled: open && form.scope === "selected_tenants",
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/notices", {
          title: form.title,
          message: form.message,
          scope: form.scope,
          property: form.property || undefined,
          floor: form.floor || undefined,
          room: form.room || undefined,
          tenants: form.scope === "selected_tenants" ? tenantIds.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        })
      ).data.data,
    onSuccess: () => {
      onCreated();
      onClose();
      setForm({ title: "", message: "", scope: "all_tenants", property: "", floor: "", room: "" });
      setTenantIds("");
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not post notice"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="New notice">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Water maintenance tomorrow" />
        </div>

        <div className="space-y-1.5">
          <Label>Message</Label>
          <Textarea rows={3} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>Audience</Label>
          <Select value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })}>
            {Object.entries(SCOPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        {["property", "floor", "room"].includes(form.scope) && (
          <div className="space-y-1.5">
            <Label>Property</Label>
            <Select required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value, floor: "", room: "" })}>
              <option value="">Select property…</option>
              {properties?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {form.scope === "floor" && form.property && (
          <div className="space-y-1.5">
            <Label>Floor</Label>
            <Select required value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}>
              <option value="">Select floor…</option>
              {floors?.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {form.scope === "room" && form.property && (
          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select required value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}>
              <option value="">Select room…</option>
              {rooms?.map((r) => (
                <option key={r._id} value={r._id}>
                  Room {r.roomNumber}
                </option>
              ))}
            </Select>
          </div>
        )}

        {form.scope === "selected_tenants" && (
          <div className="space-y-1.5">
            <Label>Tenants</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {tenants?.map((t) => (
                <label key={t._id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-muted">
                  <input
                    type="checkbox"
                    checked={tenantIds.split(",").includes(t._id)}
                    onChange={(e) => {
                      const ids = new Set(tenantIds.split(",").filter(Boolean));
                      if (e.target.checked) ids.add(t._id);
                      else ids.delete(t._id);
                      setTenantIds(Array.from(ids).join(","));
                    }}
                  />
                  {t.fullName}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Posting…" : "Post notice"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
