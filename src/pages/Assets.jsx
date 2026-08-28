import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Boxes, RotateCcw, Wrench } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

const CATEGORIES = ["Bed", "Mattress", "Table", "Chair", "Cupboard", "Fan", "AC", "TV", "Key", "Appliance", "Other"];
const STATUS_TONE = { available: "success", assigned: "primary", damaged: "danger", under_repair: "warning", lost: "danger", retired: "default" };

const emptyForm = { property: "", name: "", category: "Table", purchaseDate: "", value: "" };

export default function Assets() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: assets, isLoading } = useQuery({
    queryKey: ["assets", propertyFilter, categoryFilter, statusFilter],
    queryFn: async () =>
      (
        await api.get("/assets", {
          params: { property: propertyFilter || undefined, category: categoryFilter || undefined, status: statusFilter || undefined },
        })
      ).data.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["assets"] });

  const createMutation = useMutation({
    mutationFn: async (payload) => (await api.post("/assets", payload)).data.data,
    onSuccess: () => {
      invalidate();
      setAddOpen(false);
      setForm(emptyForm);
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add asset"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ assetId, status }) => (await api.put(`/assets/${assetId}/status`, { status })).data.data,
    onSuccess: invalidate,
  });

  const returnMutation = useMutation({
    mutationFn: async (assetId) => (await api.post(`/assets/${assetId}/return`)).data.data,
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Inventory &amp; Assets</h1>
          <p className="text-sm text-muted-foreground">Track furniture, appliances, and keys across your properties.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add asset
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
        <Select className="w-40" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : assets?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Boxes className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No assets match these filters yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets?.map((asset) => (
            <Card key={asset._id}>
              <CardContent className="space-y-2.5 pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{asset.name}</p>
                    <p className="text-xs text-muted-foreground">{asset.category}</p>
                  </div>
                  <Badge tone={STATUS_TONE[asset.status]}>{asset.status.replace("_", " ")}</Badge>
                </div>

                {asset.status === "assigned" && (
                  <p className="text-xs text-muted-foreground">
                    {asset.currentTenant ? `With ${asset.currentTenant.fullName}` : asset.currentRoom ? `Room ${asset.currentRoom.roomNumber}` : ""}
                  </p>
                )}

                <div className="flex items-center gap-1.5 border-t border-border pt-2.5">
                  {asset.status === "assigned" && (
                    <Button variant="outline" size="sm" onClick={() => returnMutation.mutate(asset._id)} disabled={returnMutation.isPending}>
                      <RotateCcw className="h-3.5 w-3.5" />
                      Return
                    </Button>
                  )}
                  {asset.status !== "under_repair" && asset.status !== "retired" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => statusMutation.mutate({ assetId: asset._id, status: "under_repair" })}
                      disabled={statusMutation.isPending}
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Repair
                    </Button>
                  )}
                  {asset.status !== "retired" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-danger"
                      onClick={() => statusMutation.mutate({ assetId: asset._id, status: "retired" })}
                      disabled={statusMutation.isPending}
                    >
                      Retire
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add asset" description="Register a new item into inventory.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate({ ...form, value: Number(form.value) || undefined });
          }}
          className="space-y-4"
        >
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

          <div className="space-y-1.5">
            <Label htmlFor="property">Property</Label>
            <Select id="property" required value={form.property} onChange={(e) => setForm({ ...form, property: e.target.value })}>
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
              <Label htmlFor="name">Item name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Study table" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="purchaseDate">Purchase date</Label>
              <Input id="purchaseDate" type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="value">Value (₹)</Label>
              <Input id="value" type="number" min={0} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add asset"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
