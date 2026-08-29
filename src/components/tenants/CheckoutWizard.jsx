import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Check, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";

const STEPS = ["Review", "Final Charges", "Assets", "Condition & Damage", "Settle & Confirm"];
const CHARGE_TYPES = ["Electricity", "Water", "Other"];

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function CheckoutWizard({ tenantId, tenantName, onClose, onCompleted }) {
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");

  const [checkoutDate, setCheckoutDate] = useState(new Date().toISOString().slice(0, 10));
  const [finalCharges, setFinalCharges] = useState([]);
  const [chargeDraft, setChargeDraft] = useState({ chargeType: "Electricity", description: "", amount: "" });

  const [assetConditions, setAssetConditions] = useState({}); // { assetId: condition }
  const [roomConditionNotes, setRoomConditionNotes] = useState("");
  const [damageAmount, setDamageAmount] = useState("");
  const [damageNotes, setDamageNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState("");

  const { data: preview, isLoading } = useQuery({
    queryKey: ["checkout-preview", tenantId],
    queryFn: async () => (await api.get(`/checkouts/preview/${tenantId}`)).data.data,
  });

  const finalChargesTotal = finalCharges.reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const totalDues = (preview?.pendingRent || 0) + finalChargesTotal;
  const estimatedRefundable = Math.max(0, (preview?.depositCollected || 0) - totalDues - (Number(damageAmount) || 0));

  const submit = useMutation({
    mutationFn: async () =>
      (
        await api.post("/checkouts", {
          tenantId,
          checkoutDate,
          finalCharges: finalCharges.map(({ chargeType, description, amount }) => ({ chargeType, description, amount: Number(amount) })),
          assetReturns: Object.entries(assetConditions).map(([assetId, condition]) => ({ assetId, condition })),
          roomConditionNotes,
          damageAmount: Number(damageAmount) || 0,
          damageNotes,
          refundAmount: refundAmount !== "" ? Number(refundAmount) : undefined,
        })
      ).data,
    onSuccess: (res) => {
      onCompleted?.(res.data);
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || "Checkout failed"),
  });

  const addCharge = () => {
    if (!chargeDraft.amount) return;
    setFinalCharges([...finalCharges, chargeDraft]);
    setChargeDraft({ chargeType: "Electricity", description: "", amount: "" });
  };

  return (
    <Dialog open onClose={onClose} title={`Check out ${tenantName}`} description="Settlement, deposit refund, and bed release — in one flow." className="max-w-lg">
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

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading tenant balance…</p>
      ) : (
        <>
          {step === 0 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Checkout date</Label>
                <Input type="date" value={checkoutDate} onChange={(e) => setCheckoutDate(e.target.value)} />
              </div>

              {!preview.noticePeriodActive && (
                <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  This tenant isn't currently in their notice period. You can still proceed.
                </div>
              )}

              <div className="rounded-md border border-border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending rent (unpaid invoices)</span>
                  <span className="font-medium">{formatINR(preview.pendingRent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit collected</span>
                  <span className="font-medium">{formatINR(preview.depositCollected)}</span>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Add any final charges — electricity, water, or other (optional).</p>
              <div className="flex flex-wrap gap-2">
                <Select className="w-32" value={chargeDraft.chargeType} onChange={(e) => setChargeDraft({ ...chargeDraft, chargeType: e.target.value })}>
                  {CHARGE_TYPES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Input
                  className="w-24"
                  type="number"
                  min={0}
                  placeholder="Amount"
                  value={chargeDraft.amount}
                  onChange={(e) => setChargeDraft({ ...chargeDraft, amount: e.target.value })}
                />
                <Input
                  className="flex-1"
                  placeholder="Description"
                  value={chargeDraft.description}
                  onChange={(e) => setChargeDraft({ ...chargeDraft, description: e.target.value })}
                />
                <Button size="sm" type="button" onClick={addCharge} disabled={!chargeDraft.amount}>
                  Add
                </Button>
              </div>
              {finalCharges.length > 0 && (
                <div className="space-y-1">
                  {finalCharges.map((c, i) => (
                    <div key={i} className="flex justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                      <span>
                        {c.chargeType}
                        {c.description ? ` — ${c.description}` : ""}
                      </span>
                      <span>{formatINR(c.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Mark the condition of any assets assigned to this tenant.</p>
              {!preview.assignedAssets?.length ? (
                <p className="rounded-md border border-border p-3 text-sm text-muted-foreground">No assets currently assigned.</p>
              ) : (
                <div className="space-y-1.5">
                  {preview.assignedAssets.map((a) => (
                    <div key={a._id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>{a.asset?.name}</span>
                      <Select
                        className="w-32"
                        value={assetConditions[a.asset._id] || "returned"}
                        onChange={(e) => setAssetConditions({ ...assetConditions, [a.asset._id]: e.target.value })}
                      >
                        <option value="returned">Returned OK</option>
                        <option value="damaged">Damaged</option>
                        <option value="lost">Lost</option>
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Room condition notes</Label>
                <Textarea rows={3} value={roomConditionNotes} onChange={(e) => setRoomConditionNotes(e.target.value)} placeholder="Any wear or damage found at inspection" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Damage charge (₹)</Label>
                  <Input type="number" min={0} value={damageAmount} onChange={(e) => setDamageAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Damage notes</Label>
                  <Input value={damageNotes} onChange={(e) => setDamageNotes(e.target.value)} placeholder="Optional" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3 text-sm">
              <div className="space-y-1 rounded-md border border-border p-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit collected</span>
                  <span>{formatINR(preview.depositCollected)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pending dues (rent + charges)</span>
                  <span>-{formatINR(totalDues)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Damage charges</span>
                  <span>-{formatINR(Number(damageAmount) || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-border pt-1.5 font-medium">
                  <span>Estimated refundable</span>
                  <span className="text-success">{formatINR(estimatedRefundable)}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Refund amount</Label>
                <Input
                  type="number"
                  min={0}
                  max={estimatedRefundable}
                  placeholder={`Defaults to ${formatINR(estimatedRefundable)}`}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="mt-5 flex justify-between border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={isLoading}>
            Next
          </Button>
        ) : (
          <Button type="button" disabled={submit.isPending} onClick={() => submit.mutate()}>
            {submit.isPending ? "Completing…" : "Complete checkout"}
          </Button>
        )}
      </div>
    </Dialog>
  );
}
