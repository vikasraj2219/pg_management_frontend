import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Shield } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const PAYMENT_STATUS_TONE = { pending: "warning", successful: "success", failed: "danger", refunded: "default" };

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function Payments() {
  const [tab, setTab] = useState("payments");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Payments &amp; Deposits</h1>
        <p className="text-sm text-muted-foreground">Every payment received, and each tenant's security deposit.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: "payments", label: "Payments" },
          { id: "deposits", label: "Deposits" },
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

      {tab === "payments" ? <PaymentsTab /> : <DepositsTab />}
    </div>
  );
}

function PaymentsTab() {
  const queryClient = useQueryClient();
  const [recordOpen, setRecordOpen] = useState(false);

  const { data: payments, isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: async () => (await api.get("/payments")).data.data,
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setRecordOpen(true)}>
          <Plus className="h-4 w-4" />
          Record payment
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : payments?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments?.map((p) => (
            <Card key={p._id}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {p.tenant?.fullName} <span className="font-normal text-muted-foreground">· {p.receiptNumber}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.method}
                    {p.invoice ? ` · ${p.invoice.invoiceNumber}` : " · Advance"} ·{" "}
                    {new Date(p.paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatINR(p.amount)}</span>
                  <Badge tone={PAYMENT_STATUS_TONE[p.status]}>{p.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RecordPaymentDialog
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        onRecorded={() => {
          queryClient.invalidateQueries({ queryKey: ["payments"] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }}
      />
    </div>
  );
}

function RecordPaymentDialog({ open, onClose, onRecorded }) {
  const [tenantId, setTenantId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [form, setForm] = useState({ amount: "", method: "Cash", transactionId: "", notes: "" });
  const [error, setError] = useState("");

  const { data: tenants } = useQuery({
    queryKey: ["tenants", "for-payment"],
    queryFn: async () => (await api.get("/tenants", { params: { limit: 100 } })).data.data,
    enabled: open,
  });

  const { data: openInvoices } = useQuery({
    queryKey: ["invoices", "tenant-open", tenantId],
    queryFn: async () => (await api.get("/invoices", { params: { tenant: tenantId } })).data.data,
    enabled: open && !!tenantId,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/payments", {
          tenantId,
          invoiceId: invoiceId || undefined,
          amount: Number(form.amount),
          method: form.method,
          transactionId: form.transactionId || undefined,
          notes: form.notes || undefined,
        })
      ).data.data,
    onSuccess: () => {
      onRecorded();
      onClose();
      setForm({ amount: "", method: "Cash", transactionId: "", notes: "" });
      setTenantId("");
      setInvoiceId("");
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not record payment"),
  });

  const unpaidInvoices = (openInvoices || []).filter((inv) => inv.balanceDue > 0);

  return (
    <Dialog open={open} onClose={onClose} title="Record payment" description="Link to an invoice, or leave unlinked for an advance payment.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-4"
      >
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="space-y-1.5">
          <Label>Tenant</Label>
          <Select
            required
            value={tenantId}
            onChange={(e) => {
              setTenantId(e.target.value);
              setInvoiceId("");
            }}
          >
            <option value="">Select tenant…</option>
            {tenants?.map((t) => (
              <option key={t._id} value={t._id}>
                {t.fullName}
              </option>
            ))}
          </Select>
        </div>

        {tenantId && unpaidInvoices.length > 0 && (
          <div className="space-y-1.5">
            <Label>Apply to invoice (optional)</Label>
            <Select value={invoiceId} onChange={(e) => setInvoiceId(e.target.value)}>
              <option value="">None — advance payment</option>
              {unpaidInvoices.map((inv) => (
                <option key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} — {formatINR(inv.balanceDue)} due
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input type="number" min={0} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              {["Cash", "UPI", "Card", "Bank Transfer", "Other"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </Select>
          </div>
        </div>

        {form.method !== "Cash" && form.method !== "Other" && (
          <div className="space-y-1.5">
            <Label>Transaction ID</Label>
            <Input required value={form.transactionId} onChange={(e) => setForm({ ...form, transactionId: e.target.value })} />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Recording…" : "Record payment"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DepositsTab() {
  const queryClient = useQueryClient();
  const [activeTenant, setActiveTenant] = useState(null);

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["deposits"],
    queryFn: async () => (await api.get("/deposits")).data.data,
  });

  return (
    <div className="space-y-2">
      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted" />)
      ) : deposits?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Shield className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Deposits appear here once a tenant's deposit has been viewed or adjusted.</p>
          </CardContent>
        </Card>
      ) : (
        deposits?.map((d) => (
          <Card key={d._id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveTenant(d.tenant)}>
            <CardContent className="flex items-center justify-between py-3.5">
              <div>
                <p className="text-sm font-medium">{d.tenant?.fullName}</p>
                <p className="text-xs text-muted-foreground">
                  Collected {formatINR(d.collectedAmount)} · Refundable {formatINR(d.refundableAmount)}
                </p>
              </div>
              <Badge tone={d.status === "held" ? "warning" : d.status === "refunded" ? "success" : "info"}>{d.status.replace("_", " ")}</Badge>
            </CardContent>
          </Card>
        ))
      )}

      {activeTenant && (
        <DepositDetailDialog
          tenant={activeTenant}
          onClose={() => setActiveTenant(null)}
          onUpdated={() => queryClient.invalidateQueries({ queryKey: ["deposits"] })}
        />
      )}
    </div>
  );
}

function DepositDetailDialog({ tenant, onClose, onUpdated }) {
  const [adjustment, setAdjustment] = useState({ type: "damage", amount: "", note: "" });
  const [error, setError] = useState("");

  const { data: deposit, isLoading } = useQuery({
    queryKey: ["deposit", tenant._id],
    queryFn: async () => (await api.get(`/deposits/${tenant._id}`)).data.data,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.put(`/deposits/${tenant._id}`, {
          addAdjustment: { type: adjustment.type, amount: Number(adjustment.amount), note: adjustment.note },
        })
      ).data.data,
    onSuccess: () => {
      setAdjustment({ type: "damage", amount: "", note: "" });
      setError("");
      onUpdated();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add adjustment"),
  });

  return (
    <Dialog open onClose={onClose} title={`${tenant.fullName}'s deposit`}>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <SummaryRow label="Required" value={formatINR(deposit.requiredAmount)} />
            <SummaryRow label="Collected" value={formatINR(deposit.collectedAmount)} />
            <SummaryRow label="Deductions" value={formatINR(deposit.collectedAmount - deposit.refundableAmount)} />
            <SummaryRow label="Refundable" value={formatINR(deposit.refundableAmount)} highlight />
          </div>

          {deposit.adjustments?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Deductions</p>
              {deposit.adjustments.map((a) => (
                <div key={a._id} className="flex justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                  <span className="capitalize">
                    {a.type}
                    {a.note ? ` — ${a.note}` : ""}
                  </span>
                  <span>{formatINR(a.amount)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Add a deduction</p>
            <div className="flex flex-wrap gap-2">
              <Select className="w-32" value={adjustment.type} onChange={(e) => setAdjustment({ ...adjustment, type: e.target.value })}>
                <option value="damage">Damage</option>
                <option value="other">Other</option>
              </Select>
              <Input
                className="w-28"
                type="number"
                min={0}
                placeholder="Amount"
                value={adjustment.amount}
                onChange={(e) => setAdjustment({ ...adjustment, amount: e.target.value })}
              />
              <Input
                className="flex-1"
                placeholder="Note (optional)"
                value={adjustment.note}
                onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })}
              />
              <Button size="sm" disabled={!adjustment.amount || mutation.isPending} onClick={() => mutation.mutate()}>
                Add
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-display font-semibold ${highlight ? "text-success" : ""}`}>{value}</p>
    </div>
  );
}
