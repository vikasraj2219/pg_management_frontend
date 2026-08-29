import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Receipt, Zap, Plus } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";

const STATUS_TONE = { pending: "warning", partial: "info", paid: "success", overdue: "danger", cancelled: "default", draft: "default" };
const CHARGE_TYPES = ["Rent", "Electricity", "Food", "Water", "Internet", "Laundry", "Parking", "Maintenance", "Late Fee", "Damage", "Other"];

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const now = new Date();

export default function Billing() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [generateOpen, setGenerateOpen] = useState(false);
  const [activeInvoiceId, setActiveInvoiceId] = useState(null);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", propertyFilter, statusFilter],
    queryFn: async () =>
      (await api.get("/invoices", { params: { property: propertyFilter || undefined, status: statusFilter || undefined } })).data.data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Billing &amp; Ledger</h1>
          <p className="text-sm text-muted-foreground">Rent invoices, charges, and payment status.</p>
        </div>
        <Button onClick={() => setGenerateOpen(true)}>
          <Zap className="h-4 w-4" />
          Generate monthly invoices
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select className="w-52" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">All properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.keys(STATUS_TONE).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : invoices?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No invoices yet — generate this month's rent invoices to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {invoices?.map((inv) => (
            <Card key={inv._id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveInvoiceId(inv._id)}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.tenant?.fullName} · {inv.billingPeriod.month}/{inv.billingPeriod.year}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs">
                    <p className="font-medium text-foreground">{formatINR(inv.totalAmount)}</p>
                    {inv.balanceDue > 0 && <p className="text-danger">{formatINR(inv.balanceDue)} due</p>}
                  </div>
                  <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <GenerateMonthlyDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        properties={properties}
        onGenerated={() => queryClient.invalidateQueries({ queryKey: ["invoices"] })}
      />

      {activeInvoiceId && <InvoiceDetailDialog invoiceId={activeInvoiceId} onClose={() => setActiveInvoiceId(null)} />}
    </div>
  );
}

function GenerateMonthlyDialog({ open, onClose, properties, onGenerated }) {
  const [propertyId, setPropertyId] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/invoices/generate-monthly", { propertyId, month: Number(month), year: Number(year) })).data,
    onSuccess: (res) => {
      setResult(res);
      setError("");
      onGenerated();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not generate invoices"),
  });

  return (
    <Dialog
      open={open}
      onClose={() => {
        setResult(null);
        onClose();
      }}
      title="Generate monthly invoices"
      description="Creates a rent invoice for every active tenant in this property who doesn't already have one for the period."
    >
      <div className="space-y-4">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        {result ? (
          <div className="space-y-2 text-sm">
            <p>
              Created <span className="font-medium text-success">{result.createdCount}</span> invoice(s), skipped{" "}
              <span className="font-medium">{result.skippedCount}</span>.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                onClose();
              }}
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label>Property</Label>
              <Select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
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
                <Label>Month</Label>
                <Select value={month} onChange={(e) => setMonth(e.target.value)}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i, 1).toLocaleString("en-US", { month: "long" })}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button disabled={!propertyId || mutation.isPending} onClick={() => mutation.mutate()}>
                {mutation.isPending ? "Generating…" : "Generate"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}

function InvoiceDetailDialog({ invoiceId, onClose }) {
  const queryClient = useQueryClient();
  const [itemForm, setItemForm] = useState({ chargeType: "Electricity", description: "", amount: "" });
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "Cash", transactionId: "" });
  const [error, setError] = useState("");

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => (await api.get(`/invoices/${invoiceId}`)).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const addItemMutation = useMutation({
    mutationFn: async () =>
      (await api.post(`/invoices/${invoiceId}/items`, { ...itemForm, amount: Number(itemForm.amount) })).data.data,
    onSuccess: () => {
      setItemForm({ chargeType: "Electricity", description: "", amount: "" });
      setError("");
      invalidate();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add charge"),
  });

  const payMutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/payments", {
          tenantId: invoice.tenant._id,
          invoiceId,
          amount: Number(paymentForm.amount),
          method: paymentForm.method,
          transactionId: paymentForm.transactionId || undefined,
        })
      ).data.data,
    onSuccess: () => {
      setPaymentForm({ amount: "", method: "Cash", transactionId: "" });
      setError("");
      invalidate();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not record payment"),
  });

  return (
    <Dialog open onClose={onClose} title={isLoading ? "Loading…" : invoice?.invoiceNumber} className="max-w-lg">
      {!isLoading && invoice && (
        <div className="space-y-4">
          {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {invoice.tenant?.fullName} · {invoice.billingPeriod.month}/{invoice.billingPeriod.year}
            </p>
            <Badge tone={STATUS_TONE[invoice.status]}>{invoice.status}</Badge>
          </div>

          <div className="space-y-1 rounded-md border border-border p-3 text-sm">
            {invoice.items.map((item) => (
              <div key={item._id} className="flex justify-between">
                <span>
                  {item.chargeType}
                  {item.description ? ` — ${item.description}` : ""}
                </span>
                <span>{formatINR(item.amount)}</span>
              </div>
            ))}
            <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatINR(invoice.subtotal)}</span>
              </div>
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>Discount</span>
                  <span>-{formatINR(invoice.discountAmount)}</span>
                </div>
              )}
              {invoice.lateFeeAmount > 0 && (
                <div className="flex justify-between">
                  <span>Late fee</span>
                  <span>{formatINR(invoice.lateFeeAmount)}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm font-medium">
              <span>Total</span>
              <span>{formatINR(invoice.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paid</span>
              <span>{formatINR(invoice.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-danger">
              <span>Balance due</span>
              <span>{formatINR(invoice.balanceDue)}</span>
            </div>
          </div>

          {invoice.status !== "cancelled" && (
            <>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Add a charge</p>
                <div className="flex flex-wrap gap-2">
                  <Select className="w-36" value={itemForm.chargeType} onChange={(e) => setItemForm({ ...itemForm, chargeType: e.target.value })}>
                    {CHARGE_TYPES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <Input
                    className="w-28"
                    type="number"
                    min={0}
                    placeholder="Amount"
                    value={itemForm.amount}
                    onChange={(e) => setItemForm({ ...itemForm, amount: e.target.value })}
                  />
                  <Input
                    className="flex-1"
                    placeholder="Description (optional)"
                    value={itemForm.description}
                    onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  />
                  <Button size="sm" disabled={!itemForm.amount || addItemMutation.isPending} onClick={() => addItemMutation.mutate()}>
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>

              {invoice.balanceDue > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Record a payment</p>
                  <div className="flex flex-wrap gap-2">
                    <Input
                      className="w-28"
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    />
                    <Select className="w-36" value={paymentForm.method} onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}>
                      {["Cash", "UPI", "Card", "Bank Transfer", "Other"].map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </Select>
                    {paymentForm.method !== "Cash" && paymentForm.method !== "Other" && (
                      <Input
                        className="flex-1"
                        placeholder="Transaction ID"
                        value={paymentForm.transactionId}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                      />
                    )}
                    <Button size="sm" disabled={!paymentForm.amount || payMutation.isPending} onClick={() => payMutation.mutate()}>
                      Record
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
