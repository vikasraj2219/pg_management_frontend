import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Building2, MapPin, BedDouble } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

const STATUS_TONE = { active: "success", inactive: "default", under_maintenance: "warning" };

const emptyForm = {
  name: "",
  code: "",
  address: "",
  city: "",
  state: "",
  pin: "",
  contactNumber: "",
  propertyType: "PG",
  gender: "Co-ed",
};

export default function Properties() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => (await api.post("/properties", payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      setOpen(false);
      setForm(emptyForm);
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not create property"),
  });

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Properties</h1>
          <p className="text-sm text-muted-foreground">Manage every PG/hostel property in your portfolio.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add property
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : data?.length === 0 ? (
        <EmptyState onAdd={() => setOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map((property) => (
            <Card
              key={property._id}
              className="cursor-pointer hover:shadow-md"
              onClick={() => navigate(`/rooms?property=${property._id}`)}
            >
              <CardContent className="space-y-3 pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-semibold">{property.name}</p>
                    <p className="text-xs text-muted-foreground">{property.code}</p>
                  </div>
                  <Badge tone={STATUS_TONE[property.status] || "default"}>
                    {property.status.replace("_", " ")}
                  </Badge>
                </div>

                {(property.city || property.state) && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {[property.city, property.state].filter(Boolean).join(", ")}
                  </p>
                )}

                <div className="flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {property.propertyType}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <BedDouble className="h-3.5 w-3.5" />
                    {property.bedSummary?.occupiedBeds ?? 0} / {property.bedSummary?.totalBeds ?? 0} beds
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Add property" description="Create a new PG/hostel property.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4"
        >
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Property name</Label>
              <Input id="name" required value={form.name} onChange={update("name")} placeholder="Sunrise PG - Whitefield" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="code">Property code</Label>
              <Input id="code" required value={form.code} onChange={update("code")} placeholder="WF01" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={update("address")} placeholder="Street, area" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" value={form.city} onChange={update("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input id="state" value={form.state} onChange={update("state")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pin">PIN</Label>
              <Input id="pin" value={form.pin} onChange={update("pin")} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="contactNumber">Contact number</Label>
              <Input id="contactNumber" value={form.contactNumber} onChange={update("contactNumber")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="propertyType">Type</Label>
              <Select id="propertyType" value={form.propertyType} onChange={update("propertyType")}>
                {["PG", "Hostel", "Co-living", "Rental Rooms", "Other"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" value={form.gender} onChange={update("gender")}>
                {["Male", "Female", "Co-ed"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating…" : "Create property"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No properties yet</p>
          <p className="text-sm text-muted-foreground">Add your first PG/hostel property to start managing rooms and beds.</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Add property
        </Button>
      </CardContent>
    </Card>
  );
}
