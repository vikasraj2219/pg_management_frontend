import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const TABS = [
  { id: "financial", label: "Financial" },
  { id: "occupancy", label: "Occupancy" },
  { id: "tenants", label: "Tenants" },
  { id: "operations", label: "Operations" },
];

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function Reports() {
  const [tab, setTab] = useState("financial");
  const [propertyFilter, setPropertyFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const params = { property: propertyFilter || undefined, from: from || undefined, to: to || undefined };

  const { data, isLoading } = useQuery({
    queryKey: ["report", tab, propertyFilter, from, to],
    queryFn: async () => (await api.get(`/reports/${tab}`, { params })).data.data,
  });

  const exportUrl = () => {
    const qs = new URLSearchParams({ ...params, format: "csv" });
    return `${import.meta.env.VITE_API_URL || "/api"}/reports/${tab}?${qs.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">Financial, occupancy, tenant, and operations reports.</p>
        </div>
        <a href={exportUrl()} target="_blank" rel="noreferrer">
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </a>
      </div>

      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
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

      <div className="flex flex-wrap gap-2">
        <Select className="w-48" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">All properties</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {tab === "financial" && data && <FinancialReport data={data} />}
          {tab === "occupancy" && data && <OccupancyReport data={data} />}
          {tab === "tenants" && data && <TenantReport data={data} />}
          {tab === "operations" && data && <OperationsReport data={data} />}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, tone }) {
  return (
    <Card>
      <CardContent className="pt-5">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`font-display text-xl font-semibold ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function FinancialReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBox label="Revenue" value={formatINR(data.totalRevenue)} tone="success" />
        <StatBox label="Expenses" value={formatINR(data.totalExpenses)} />
        <StatBox label="Profit" value={formatINR(data.profit)} tone={data.profit >= 0 ? "success" : "danger"} />
        <StatBox label="Pending + overdue rent" value={formatINR(data.pendingRent + data.overdueRent)} tone="danger" />
      </div>
      <p className="text-xs text-muted-foreground">{data.payments.length} payment(s) in this period.</p>
    </div>
  );
}

function OccupancyReport({ data }) {
  return (
    <div className="space-y-2">
      {data.byProperty.map((p, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between py-3.5">
            <p className="text-sm font-medium">{p.property}</p>
            <p className="text-sm text-muted-foreground">
              {p.occupiedBeds}/{p.totalBeds} beds · {p.occupancyPercent}% · {p.totalRooms} rooms
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TenantReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <StatBox label="Active tenants" value={data.summary.activeTenants} />
        <StatBox label="Notice period" value={data.summary.noticePeriod} tone="danger" />
        <StatBox label="Checked out" value={data.summary.checkedOut} />
      </div>
      <p className="text-xs text-muted-foreground">{data.tenants.length} tenant record(s) in this period.</p>
    </div>
  );
}

function OperationsReport({ data }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatBox label="Visitors" value={data.visitorCount} />
        <StatBox label="Maintenance tickets" value={data.ticketsByStatus.reduce((s, t) => s + t.count, 0)} />
        <StatBox
          label="Maintenance cost"
          value={formatINR(data.ticketsByStatus.reduce((s, t) => s + (t.totalCost || 0), 0))}
        />
        <StatBox label="Expense categories" value={data.expensesByCategory.length} />
      </div>

      {data.expensesByCategory.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Expenses by category</p>
          {data.expensesByCategory.map((e, i) => (
            <div key={i} className="flex justify-between rounded-md border border-border px-3 py-1.5 text-sm">
              <span>{e._id}</span>
              <span>{formatINR(e.total)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
