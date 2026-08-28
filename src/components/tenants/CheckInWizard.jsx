import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { BedDouble, Check } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";

const STEPS = ["Room & Bed", "Rent & Agreement", "Assets", "Meter & Condition", "Confirm"];

export default function CheckInWizard({ tenantId, tenantName, onClose, onCompleted }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const [propertyId, setPropertyId] = useState("");
  const [bed, setBed] = useState(null); // { _id, label, roomNumber }

  const [agreement, setAgreement] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: "",
    rentAmount: "",
    depositAmount: "",
    termsText: "",
  });

  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [meter, setMeter] = useState({ meterNumber: "", meterReading: "" });
  const [roomConditionNotes, setRoomConditionNotes] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: rooms } = useQuery({
    queryKey: ["rooms", propertyId],
    queryFn: async () => (await api.get(`/properties/${propertyId}/rooms`)).data.data,
    enabled: !!propertyId,
  });

  const { data: assets } = useQuery({
    queryKey: ["assets", propertyId, "available"],
    queryFn: async () => (await api.get("/assets", { params: { property: propertyId, status: "available" } })).data.data,
    enabled: !!propertyId && step === 2,
  });

  const availableBeds = (rooms || []).flatMap((room) =>
    room.beds.filter((b) => b.status === "available").map((b) => ({ ...b, roomNumber: room.roomNumber }))
  );

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/checkins", {
          tenantId,
          bedId: bed._id,
          startDate: agreement.startDate,
          endDate: agreement.endDate || undefined,
          rentAmount: Number(agreement.rentAmount) || undefined,
          depositAmount: Number(agreement.depositAmount) || undefined,
          termsText: agreement.termsText,
          assetIds: selectedAssetIds,
          meterNumber: meter.meterNumber || undefined,
          meterReading: Number(meter.meterReading) || undefined,
          roomConditionNotes,
        })
      ).data,
    onSuccess: (res) => {
      onCompleted?.(res.data);
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || "Check-in failed"),
  });

  const canProceed = {
    0: !!bed,
    1: !!agreement.startDate,
    2: true,
    3: true,
    4: true,
  }[step];

  const toggleAsset = (id) => {
    setSelectedAssetIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <Dialog open onClose={onClose} title={`Check in ${tenantName}`} description="Room allocation, agreement, assets, and condition — in one flow.">
      <div className="mb-4 flex items-center gap-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-1">
            <div
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary text-primary" : "border border-border text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>
      <p className="mb-4 text-xs font-medium text-muted-foreground">{STEPS[step]}</p>

      {error && <div className="mb-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {step === 0 && (
        <div className="space-y-3">
          <Select value={propertyId} onChange={(e) => { setPropertyId(e.target.value); setBed(null); }}>
            <option value="">Select property…</option>
            {properties?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          {propertyId && (
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
              {availableBeds.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">No available beds in this property.</p>
              ) : (
                availableBeds.map((b) => (
                  <button
                    key={b._id}
                    onClick={() => setBed(b)}
                    className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-muted ${
                      bed?._id === b._id ? "bg-primary/10 text-primary" : ""
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <BedDouble className="h-4 w-4" />
                      Room {b.roomNumber} · Bed {b.label}
                    </span>
                    {bed?._id === b._id && <Check className="h-4 w-4" />}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={agreement.startDate} onChange={(e) => setAgreement({ ...agreement, startDate: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={agreement.endDate} onChange={(e) => setAgreement({ ...agreement, endDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Rent (₹/month)</Label>
              <Input type="number" min={0} value={agreement.rentAmount} onChange={(e) => setAgreement({ ...agreement, rentAmount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deposit (₹)</Label>
              <Input type="number" min={0} value={agreement.depositAmount} onChange={(e) => setAgreement({ ...agreement, depositAmount: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Agreement terms</Label>
            <Textarea rows={4} value={agreement.termsText} onChange={(e) => setAgreement({ ...agreement, termsText: e.target.value })} placeholder="Notice period, house rules, etc." />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Select any items to hand over with this room (optional).</p>
          {!assets?.length ? (
            <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">No available assets for this property.</p>
          ) : (
            <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {assets.map((a) => (
                <label key={a._id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                  <input type="checkbox" checked={selectedAssetIds.includes(a._id)} onChange={() => toggleAsset(a._id)} />
                  {a.name} <span className="text-xs text-muted-foreground">({a.category})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Meter number</Label>
              <Input value={meter.meterNumber} onChange={(e) => setMeter({ ...meter, meterNumber: e.target.value })} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Initial reading</Label>
              <Input type="number" value={meter.meterReading} onChange={(e) => setMeter({ ...meter, meterReading: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Room condition notes</Label>
            <Textarea rows={3} value={roomConditionNotes} onChange={(e) => setRoomConditionNotes(e.target.value)} placeholder="Any existing damage or wear to note before move-in" />
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-2 text-sm">
          <SummaryRow label="Bed" value={bed ? `Room ${bed.roomNumber} · Bed ${bed.label}` : "—"} />
          <SummaryRow label="Rent / Deposit" value={`₹${agreement.rentAmount || 0} / ₹${agreement.depositAmount || 0}`} />
          <SummaryRow label="Agreement period" value={`${agreement.startDate}${agreement.endDate ? ` → ${agreement.endDate}` : ""}`} />
          <SummaryRow label="Assets" value={selectedAssetIds.length ? `${selectedAssetIds.length} item(s)` : "None"} />
          <SummaryRow label="Meter" value={meter.meterNumber ? `${meter.meterNumber} @ ${meter.meterReading || 0}` : "Not recorded"} />
        </div>
      )}

      <div className="mt-5 flex justify-between border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" disabled={!canProceed} onClick={() => setStep((s) => s + 1)}>
            Next
          </Button>
        ) : (
          <Button type="button" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Completing…" : "Complete check-in"}
          </Button>
        )}
      </div>
    </Dialog>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between rounded-md border border-border px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
