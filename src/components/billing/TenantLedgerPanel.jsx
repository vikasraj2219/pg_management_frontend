import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE = { pending: "warning", partial: "info", paid: "success", overdue: "danger", cancelled: "default" };

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function TenantLedgerPanel({ tenantId }) {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant-ledger", tenantId],
    queryFn: async () => (await api.get(`/tenants/${tenantId}/ledger`)).data.data,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading ledger…</p>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Total charged</p>
          <p className="font-display text-lg font-semibold">{formatINR(data.totalCharges)}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Total paid</p>
          <p className="font-display text-lg font-semibold text-success">{formatINR(data.totalPaid)}</p>
        </div>
        <div className="rounded-md border border-border p-3">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className={`font-display text-lg font-semibold ${data.outstandingBalance > 0 ? "text-danger" : ""}`}>
            {formatINR(data.outstandingBalance)}
          </p>
        </div>
      </div>

      {data.invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices generated for this tenant yet.</p>
      ) : (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Invoices</p>
          {data.invoices.map((inv) => (
            <div key={inv._id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {inv.billingPeriod.month}/{inv.billingPeriod.year}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatINR(inv.totalAmount)}</span>
                <Badge tone={STATUS_TONE[inv.status]}>{inv.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
