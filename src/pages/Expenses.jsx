import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Plus, Gauge, Eye } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const EXPENSE_CATEGORIES = [
  "Electricity",
  "Water",
  "Groceries",
  "Food",
  "Staff Salary",
  "Repairs",
  "Maintenance",
  "Internet",
  "Cleaning",
  "Security",
  "Marketing",
  "Other",
];
const PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer", "Other"];

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function Expenses() {
  const [tab, setTab] = useState("expenses");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Expenses &amp; Electricity</h1>
        <p className="text-sm text-muted-foreground">Property expenses and electricity meter readings.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: "expenses", label: "Expenses" },
          { id: "meters", label: "Meters" },
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

      {tab === "expenses" ? <ExpensesTab /> : <MetersTab />}
    </div>
  );
}

function ExpensesTab() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["expenses", propertyFilter, categoryFilter],
    queryFn: async () =>
      (await api.get("/expenses", { params: { property: propertyFilter || undefined, category: categoryFilter || undefined } })).data,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Select className="w-48" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
            <option value="">All properties</option>
            {properties?.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select className="w-44" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </div>

      {!isLoading && data?.data?.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Total: <span className="font-medium text-foreground">{formatINR(data.total)}</span> across {data.count} expense(s)
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Wallet className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {data?.data?.map((e) => (
            <Card key={e._id}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {e.category} {e.vendor ? <span className="font-normal text-muted-foreground">· {e.vendor}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.property?.name} · {e.paymentMethod} ·{" "}
                    {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatINR(e.amount)}</span>
                  {e.billUrl && (
                    <a href={`${import.meta.env.VITE_API_URL || "/api"}/expenses/${e._id}/bill`} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="icon" title="View bill">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddExpenseDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        properties={properties}
        onAdded={() => {
          queryClient.invalidateQueries({ queryKey: ["expenses"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }}
      />
    </div>
  );
}

function AddExpenseDialog({ open, onClose, properties, onAdded }) {
  const [form, setForm] = useState({ property: "", category: "Maintenance", vendor: "", amount: "", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", notes: "" });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
      if (file) formData.append("file", file);
      return (await api.post("/expenses", formData, { headers: { "Content-Type": "multipart/form-data" } })).data.data;
    },
    onSuccess: () => {
      onAdded();
      onClose();
      setForm({ property: "", category: "Maintenance", vendor: "", amount: "", date: new Date().toISOString().slice(0, 10), paymentMethod: "Cash", notes: "" });
      setFile(null);
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add expense"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Add expense">
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
            <Label>Category</Label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Vendor</Label>
            <Input value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} placeholder="Optional" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Amount (₹)</Label>
            <Input type="number" min={0} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Payment method</Label>
          <Select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Bill / receipt (optional)</Label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add expense"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MetersTab() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [addMeterOpen, setAddMeterOpen] = useState(false);
  const [activeMeter, setActiveMeter] = useState(null);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: meters, isLoading } = useQuery({
    queryKey: ["meters", propertyFilter],
    queryFn: async () => (await api.get("/meters", { params: { property: propertyFilter || undefined } })).data.data,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select className="w-48" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">All properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Button onClick={() => setAddMeterOpen(true)} disabled={!properties?.length}>
          <Plus className="h-4 w-4" />
          Add meter
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : meters?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Gauge className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No meters set up yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meters?.map((m) => (
            <Card key={m._id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveMeter(m)}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {m.label || m.meterNumber} {m.room ? <span className="font-normal text-muted-foreground">· Room {m.room.roomNumber}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.meterNumber}</p>
                </div>
                {m.latestReading ? (
                  <div className="text-right text-xs">
                    <p className="font-medium text-foreground">{formatINR(m.latestReading.totalAmount)}</p>
                    <p className="text-muted-foreground">
                      Last read {new Date(m.latestReading.readingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                ) : (
                  <Badge tone="default">No readings yet</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddMeterDialog
        open={addMeterOpen}
        onClose={() => setAddMeterOpen(false)}
        properties={properties}
        onAdded={() => queryClient.invalidateQueries({ queryKey: ["meters"] })}
      />

      {activeMeter && (
        <MeterReadingsDialog
          meter={activeMeter}
          onClose={() => setActiveMeter(null)}
          onAdded={() => queryClient.invalidateQueries({ queryKey: ["meters"] })}
        />
      )}
    </div>
  );
}

function AddMeterDialog({ open, onClose, properties, onAdded }) {
  const [form, setForm] = useState({ property: "", meterNumber: "", label: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.post("/meters", form)).data.data,
    onSuccess: () => {
      onAdded();
      onClose();
      setForm({ property: "", meterNumber: "", label: "" });
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add meter"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="Add meter">
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
        <div className="space-y-1.5">
          <Label>Meter number</Label>
          <Input required value={form.meterNumber} onChange={(e) => setForm({ ...form, meterNumber: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Label</Label>
          <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="e.g. Main meter" />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add meter"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MeterReadingsDialog({ meter, onClose, onAdded }) {
  const [form, setForm] = useState({ currentReading: "", ratePerUnit: "", fixedCharges: "" });
  const [error, setError] = useState("");

  const { data: readings, isLoading } = useQuery({
    queryKey: ["meter-readings", meter._id],
    queryFn: async () => (await api.get(`/meters/${meter._id}/readings`)).data.data,
  });

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/meters/${meter._id}/readings`, {
          currentReading: Number(form.currentReading),
          ratePerUnit: Number(form.ratePerUnit),
          fixedCharges: Number(form.fixedCharges) || 0,
        })
      ).data.data,
    onSuccess: () => {
      onAdded();
      setForm({ currentReading: "", ratePerUnit: "", fixedCharges: "" });
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not add reading"),
  });

  return (
    <Dialog open onClose={onClose} title={meter.label || meter.meterNumber} description="Reading history and a new entry.">
      <div className="space-y-4">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-medium text-muted-foreground">New reading</p>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              placeholder="Current reading"
              value={form.currentReading}
              onChange={(e) => setForm({ ...form, currentReading: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Rate / unit"
              value={form.ratePerUnit}
              onChange={(e) => setForm({ ...form, ratePerUnit: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Fixed charges"
              value={form.fixedCharges}
              onChange={(e) => setForm({ ...form, fixedCharges: e.target.value })}
            />
          </div>
          <Button size="sm" disabled={!form.currentReading || !form.ratePerUnit || mutation.isPending} onClick={() => mutation.mutate()}>
            Record reading
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading history…</p>
        ) : readings?.length === 0 ? (
          <p className="text-sm text-muted-foreground">No readings recorded yet.</p>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {readings.map((r) => (
              <div key={r._id} className="flex justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  {r.previousReading} → {r.currentReading} ({r.unitsConsumed} units)
                </span>
                <span className="font-medium">{formatINR(r.totalAmount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
}
