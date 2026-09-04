import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard } from "lucide-react";
import api from "@/lib/api";
import { loadRazorpayScript } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const STATUS_TONE = { trialing: "info", active: "success", past_due: "warning", suspended: "danger", cancelled: "default" };
const STATUS_LABEL = {
  trialing: "Free trial",
  active: "Active",
  past_due: "Payment failed",
  suspended: "Suspended",
  cancelled: "Cancelled",
};

export default function BillingTab() {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: async () => (await api.get("/billing/subscription")).data.data,
  });

  const { data: invoices } = useQuery({
    queryKey: ["billing-invoices"],
    queryFn: async () => (await api.get("/billing/invoices")).data.data,
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.post("/billing/cancel")).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing-subscription"] }),
    onError: (err) => setError(err.response?.data?.message || "Could not cancel subscription"),
  });

  const resumeMutation = useMutation({
    mutationFn: async () => (await api.post("/billing/resume")).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing-subscription"] }),
    onError: (err) => setError(err.response?.data?.message || "Could not resume subscription"),
  });

  const handleAddPaymentMethod = async () => {
    setError("");
    setCheckoutLoading(true);
    try {
      await loadRazorpayScript();
      const { data: order } = await api.post("/billing/checkout");
      const options = {
        key: order.data.keyId,
        amount: order.data.amount,
        currency: order.data.currency,
        name: order.data.organizationName,
        description: `Subscription — ${order.data.bedCount} bed${order.data.bedCount === 1 ? "" : "s"}`,
        order_id: order.data.orderId,
        prefill: order.data.prefill,
        handler: async (response) => {
          try {
            await api.post("/billing/checkout/confirm", response);
            queryClient.invalidateQueries({ queryKey: ["billing-subscription"] });
            queryClient.invalidateQueries({ queryKey: ["billing-invoices"] });
          } catch (err) {
            setError(err.response?.data?.message || "Payment succeeded but confirmation failed — contact support.");
          }
        },
        theme: { color: "#4f46e5" },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => setError("Payment failed. Please try again."));
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not start checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoading || !subscription) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      <Card className="max-w-2xl">
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current plan</p>
              <p className="font-display text-lg font-semibold">₹{subscription.ratePerBed} / bed / month</p>
            </div>
            <Badge tone={STATUS_TONE[subscription.status]}>{STATUS_LABEL[subscription.status] || subscription.status}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Beds provisioned</p>
              <p className="text-sm font-medium">{subscription.currentBedCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimated next charge</p>
              <p className="text-sm font-medium">{formatINR(subscription.estimatedNextChargeAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {subscription.status === "trialing" ? "Trial ends" : "Next charge date"}
              </p>
              <p className="text-sm font-medium">
                {new Date(
                  subscription.status === "trialing" ? subscription.trialEndsAt : subscription.nextChargeDate
                ).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border pt-4 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            {subscription.hasPaymentMethod ? (
              <span className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" /> Payment method on file
              </span>
            ) : (
              <span className="text-muted-foreground">No payment method on file yet</span>
            )}
          </div>

          {subscription.cancelAtPeriodEnd && (
            <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              Your subscription will end on{" "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.
            </div>
          )}

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {(subscription.status === "trialing" || subscription.status === "past_due" || subscription.status === "suspended") && (
              <Button onClick={handleAddPaymentMethod} disabled={checkoutLoading}>
                {checkoutLoading ? "Starting checkout…" : subscription.hasPaymentMethod ? "Retry payment" : "Add payment method"}
              </Button>
            )}
            {subscription.status === "active" && !subscription.cancelAtPeriodEnd && (
              <Button variant="outline" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                {cancelMutation.isPending ? "Cancelling…" : "Cancel subscription"}
              </Button>
            )}
            {subscription.cancelAtPeriodEnd && (
              <Button variant="outline" onClick={() => resumeMutation.mutate()} disabled={resumeMutation.isPending}>
                {resumeMutation.isPending ? "Resuming…" : "Keep subscription"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-2 text-sm font-medium">Invoice history</h3>
        {!invoices?.length ? (
          <p className="text-sm text-muted-foreground">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <Card key={inv._id}>
                <CardContent className="flex items-center justify-between py-3.5">
                  <div>
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(inv.periodStart).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {inv.bedCount} beds
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{formatINR(inv.amount)}</span>
                    <Badge tone={inv.status === "paid" ? "success" : inv.status === "failed" ? "danger" : "warning"}>{inv.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
