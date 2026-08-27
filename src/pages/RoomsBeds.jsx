import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, DoorOpen, BedDouble } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import BedPill, { STATUS_LABELS } from "@/components/rooms/BedPill";

const BED_STATUS_OPTIONS = ["available", "reserved", "maintenance", "blocked"];

export default function RoomsBeds() {
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyId = searchParams.get("property") || "";
  const queryClient = useQueryClient();

  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  useEffect(() => {
    if (!propertyId && properties?.length) {
      setSearchParams({ property: properties[0]._id });
    }
  }, [propertyId, properties, setSearchParams]);

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms", propertyId],
    queryFn: async () => (await api.get(`/properties/${propertyId}/rooms`)).data.data,
    enabled: !!propertyId,
  });

  const bedStatusMutation = useMutation({
    mutationFn: async ({ bedId, status }) => (await api.put(`/beds/${bedId}/status`, { status })).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setSelectedBed(null);
    },
  });

  const roomsByFloor = useMemo(() => {
    const groups = {};
    for (const room of rooms || []) {
      const key = room.floor?.name || "Unassigned floor";
      (groups[key] = groups[key] || []).push(room);
    }
    return groups;
  }, [rooms]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Rooms &amp; Beds</h1>
          <p className="text-sm text-muted-foreground">Visual occupancy across every room.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            className="w-56"
            value={propertyId}
            onChange={(e) => setSearchParams({ property: e.target.value })}
          >
            {properties?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Button onClick={() => setRoomDialogOpen(true)} disabled={!propertyId}>
            <Plus className="h-4 w-4" />
            Add room
          </Button>
        </div>
      </div>

      <Legend />

      {!propertyId ? (
        <EmptyState message="Add a property first to start creating rooms and beds." />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : rooms?.length === 0 ? (
        <EmptyState message="No rooms yet for this property. Add your first room to generate its beds." />
      ) : (
        Object.entries(roomsByFloor).map(([floorName, floorRooms]) => (
          <div key={floorName} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{floorName}</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {floorRooms.map((room) => (
                <Card key={room._id}>
                  <CardContent className="space-y-3 pt-5">
                    <div className="flex items-center justify-between">
                      <p className="flex items-center gap-1.5 font-display font-semibold">
                        <DoorOpen className="h-4 w-4 text-muted-foreground" />
                        Room {room.roomNumber}
                      </p>
                      <span className="text-xs text-muted-foreground">{room.roomType}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {room.beds.map((bed) => (
                        <BedPill key={bed._id} bed={bed} onClick={setSelectedBed} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}

      <AddRoomDialog
        open={roomDialogOpen}
        onClose={() => setRoomDialogOpen(false)}
        propertyId={propertyId}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["rooms", propertyId] });
          queryClient.invalidateQueries({ queryKey: ["properties"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }}
      />

      <Dialog open={!!selectedBed} onClose={() => setSelectedBed(null)} title={selectedBed ? `Bed ${selectedBed.label}` : ""}>
        {selectedBed?.status === "occupied" ? (
          <p className="text-sm text-muted-foreground">
            This bed is occupied. Status changes go through checkout once the Tenant module is available.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Update this bed's status:</p>
            <div className="flex flex-wrap gap-2">
              {BED_STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  variant={selectedBed?.status === status ? "default" : "outline"}
                  size="sm"
                  disabled={bedStatusMutation.isPending}
                  onClick={() => bedStatusMutation.mutate({ bedId: selectedBed._id, status })}
                >
                  {STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function AddRoomDialog({ open, onClose, propertyId, onCreated }) {
  const [buildingMode, setBuildingMode] = useState("new");
  const [buildingId, setBuildingId] = useState("");
  const [newBuildingName, setNewBuildingName] = useState("Main Building");

  const [floorMode, setFloorMode] = useState("new");
  const [floorId, setFloorId] = useState("");
  const [newFloorName, setNewFloorName] = useState("Ground Floor");

  const [roomForm, setRoomForm] = useState({ roomNumber: "", roomType: "Double Sharing", capacity: 2, rentPerBed: "" });
  const [error, setError] = useState("");

  const { data: buildings } = useQuery({
    queryKey: ["buildings", propertyId],
    queryFn: async () => (await api.get(`/properties/${propertyId}/buildings`)).data.data,
    enabled: open && !!propertyId,
  });

  const { data: floors } = useQuery({
    queryKey: ["floors", buildingId],
    queryFn: async () => (await api.get(`/buildings/${buildingId}/floors`)).data.data,
    enabled: open && buildingMode === "select" && !!buildingId,
  });

  const submit = useMutation({
    mutationFn: async () => {
      let resolvedBuildingId = buildingId;
      if (buildingMode === "new") {
        const res = await api.post(`/properties/${propertyId}/buildings`, { name: newBuildingName });
        resolvedBuildingId = res.data.data._id;
      }

      let resolvedFloorId = floorId;
      if (floorMode === "new") {
        const res = await api.post(`/buildings/${resolvedBuildingId}/floors`, { name: newFloorName });
        resolvedFloorId = res.data.data._id;
      }

      await api.post(`/floors/${resolvedFloorId}/rooms`, {
        ...roomForm,
        capacity: Number(roomForm.capacity),
        rentPerBed: Number(roomForm.rentPerBed) || 0,
      });
    },
    onSuccess: () => {
      onCreated();
      onClose();
      setRoomForm({ roomNumber: "", roomType: "Double Sharing", capacity: 2, rentPerBed: "" });
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not create room"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Add room" description="Rooms belong to a building and floor — beds are generated automatically from capacity.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-4"
      >
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <PickOrCreate
          label="Building"
          mode={buildingMode}
          setMode={setBuildingMode}
          options={buildings}
          value={buildingId}
          setValue={setBuildingId}
          newValue={newBuildingName}
          setNewValue={setNewBuildingName}
        />

        {buildingMode === "select" && buildingId && (
          <PickOrCreate
            label="Floor"
            mode={floorMode}
            setMode={setFloorMode}
            options={floors}
            value={floorId}
            setValue={setFloorId}
            newValue={newFloorName}
            setNewValue={setNewFloorName}
          />
        )}
        {buildingMode === "new" && (
          <div className="space-y-1.5">
            <Label>Floor name</Label>
            <Input value={newFloorName} onChange={(e) => setNewFloorName(e.target.value)} placeholder="Ground Floor" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="roomNumber">Room number</Label>
            <Input
              id="roomNumber"
              required
              value={roomForm.roomNumber}
              onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
              placeholder="101"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roomType">Room type</Label>
            <Select id="roomType" value={roomForm.roomType} onChange={(e) => setRoomForm({ ...roomForm, roomType: e.target.value })}>
              {["Single", "Double Sharing", "Triple Sharing", "Four Sharing", "Custom"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="capacity">Beds in this room</Label>
            <Input
              id="capacity"
              type="number"
              min={1}
              max={10}
              required
              value={roomForm.capacity}
              onChange={(e) => setRoomForm({ ...roomForm, capacity: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rentPerBed">Rent per bed (₹)</Label>
            <Input
              id="rentPerBed"
              type="number"
              min={0}
              value={roomForm.rentPerBed}
              onChange={(e) => setRoomForm({ ...roomForm, rentPerBed: e.target.value })}
              placeholder="8000"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? "Creating…" : "Create room"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function PickOrCreate({ label, mode, setMode, options, value, setValue, newValue, setNewValue }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        {options?.length > 0 && (
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setMode(mode === "select" ? "new" : "select")}
          >
            {mode === "select" ? `+ New ${label.toLowerCase()}` : `Choose existing`}
          </button>
        )}
      </div>
      {mode === "select" ? (
        <Select value={value} onChange={(e) => setValue(e.target.value)} required>
          <option value="">Select {label.toLowerCase()}…</option>
          {options?.map((o) => (
            <option key={o._id} value={o._id}>
              {o.name}
            </option>
          ))}
        </Select>
      ) : (
        <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={`New ${label.toLowerCase()} name`} required />
      )}
    </div>
  );
}

function Legend() {
  const items = ["available", "occupied", "notice_period", "maintenance", "reserved", "blocked"];
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((status) => (
        <span key={status} className="flex items-center gap-1.5">
          <BedDouble className="h-3.5 w-3.5" />
          {STATUS_LABELS[status]}
        </span>
      ))}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
        <BedDouble className="h-10 w-10 text-muted-foreground" />
        <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
