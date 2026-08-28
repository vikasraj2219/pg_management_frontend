import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BedDouble } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export default function AssignBedPanel({ tenantId, onAssigned }) {
  const [propertyId, setPropertyId] = useState("");
  const [error, setError] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: rooms, isLoading } = useQuery({
    queryKey: ["rooms", propertyId],
    queryFn: async () => (await api.get(`/properties/${propertyId}/rooms`)).data.data,
    enabled: !!propertyId,
  });

  const assignMutation = useMutation({
    mutationFn: async (bedId) => (await api.post(`/tenants/${tenantId}/assign-bed`, { bedId })).data.data,
    onSuccess: () => {
      setError("");
      onAssigned?.();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not assign bed"),
  });

  const availableBeds = (rooms || []).flatMap((room) =>
    room.beds.filter((bed) => bed.status === "available").map((bed) => ({ ...bed, roomNumber: room.roomNumber }))
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">This tenant doesn't have a bed yet. Pick a property, then an available bed.</p>

      {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
        <option value="">Select property…</option>
        {properties?.map((p) => (
          <option key={p._id} value={p._id}>
            {p.name}
          </option>
        ))}
      </Select>

      {propertyId && (
        <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
          {isLoading ? (
            <p className="p-2 text-sm text-muted-foreground">Loading beds…</p>
          ) : availableBeds.length === 0 ? (
            <p className="p-2 text-sm text-muted-foreground">No available beds in this property right now.</p>
          ) : (
            availableBeds.map((bed) => (
              <button
                key={bed._id}
                onClick={() => assignMutation.mutate(bed._id)}
                disabled={assignMutation.isPending}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-muted disabled:opacity-50"
              >
                <span className="flex items-center gap-2">
                  <BedDouble className="h-4 w-4 text-muted-foreground" />
                  Room {bed.roomNumber} · Bed {bed.label}
                </span>
                <span className="text-xs text-primary">Assign</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
