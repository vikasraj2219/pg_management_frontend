import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ScanFace, Plus, LogOut } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

export default function Visitors() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [insideOnly, setInsideOnly] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: visitors, isLoading } = useQuery({
    queryKey: ["visitors", propertyFilter, insideOnly],
    queryFn: async () =>
      (await api.get("/visitors", { params: { property: propertyFilter || undefined, inside: insideOnly ? "true" : undefined } })).data.data,
  });

  const exitMutation = useMutation({
    mutationFn: async (id) => (await api.put(`/visitors/${id}/exit`)).data.data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["visitors"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Visitors</h1>
          <p className="text-sm text-muted-foreground">Who's on the property right now, and the full visitor log.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Log visitor
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select className="w-48" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">All properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input type="checkbox" checked={insideOnly} onChange={(e) => setInsideOnly(e.target.checked)} />
          Currently inside only
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : visitors?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <ScanFace className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No visitors to show.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {visitors?.map((v) => (
            <Card key={v._id}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {v.name} {v.purpose ? <span className="font-normal text-muted-foreground">· {v.purpose}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {v.tenant ? `Visiting ${v.tenant.fullName}` : v.room ? `Room ${v.room.roomNumber}` : ""} · In{" "}
                    {new Date(v.entryTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    {v.exitTime && ` · Out ${new Date(v.exitTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                </div>
                {v.exitTime ? (
                  <Badge tone="default">Checked out</Badge>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => exitMutation.mutate(v._id)} disabled={exitMutation.isPending}>
                    <LogOut className="h-3.5 w-3.5" />
                    Check out
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LogVisitorDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        properties={properties}
        onLogged={() => queryClient.invalidateQueries({ queryKey: ["visitors"] })}
      />
    </div>
  );
}

function LogVisitorDialog({ open, onClose, properties, onLogged }) {
  const [form, setForm] = useState({ property: "", name: "", phone: "", purpose: "", idProof: "", vehicleNumber: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/visitors", form)).data.data,
    onSuccess: () => {
      onLogged();
      onClose();
      setForm({ property: "", name: "", phone: "", purpose: "", idProof: "", vehicleNumber: "" });
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not log visitor"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Log visitor entry">
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
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Purpose</Label>
          <Input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="e.g. Meeting tenant, delivery" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>ID proof</Label>
            <Input value={form.idProof} onChange={(e) => setForm({ ...form, idProof: e.target.value })} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Vehicle number</Label>
            <Input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Logging…" : "Log entry"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
