import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BedDouble, CheckCircle2, Clock } from "lucide-react";
import api from "@/lib/api";
import { loadRazorpayScript } from "@/lib/razorpay";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Shown right after signup (spec §5.3: "redirect to a 'start your trial' /
// 'add payment method' step rather than straight to the dashboard, so
// trial-to-paid conversion has a clear on-ramp"). Adding a card is
// optional here — the trial itself needs no card — but doing it now sets
// the org up to renew automatically once the trial ends.
export default function OnboardingBilling() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const { data: subscription } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: async () => (await api.get("/billing/subscription")).data.data,
  });

  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;

  const handleAddPaymentMethod = async () => {
    setError("");
    setLoading(true);
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
            setDone(true);
          } catch (err) {
            setError(err.response?.data?.message || "Payment succeeded but confirmation failed — you can retry from Settings later.");
          }
        },
        theme: { color: "#4f46e5" },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => setError("Payment failed. You can add a card later from Settings → Billing."));
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-5">
        <div className="flex items-center gap-2">
          <BedDouble className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-semibold">StayOps</span>
        </div>

        <div>
          <h2 className="font-display text-2xl font-semibold">You're all set — start your trial</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            14 days free, no card required. Add a payment method now so your subscription renews automatically when the trial ends,
            or skip and do this later from Settings.
          </p>
        </div>

        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-info" />
              {trialEndsAt
                ? `Free trial ends ${trialEndsAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                : "Free trial active"}
            </div>
            <div className="text-sm text-muted-foreground">₹12 per bed per month after your trial — billed monthly.</div>

            {done ? (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" /> Payment method added.
              </div>
            ) : (
              <Button onClick={handleAddPaymentMethod} disabled={loading} className="w-full">
                {loading ? "Starting checkout…" : "Add payment method"}
              </Button>
            )}
          </CardContent>
        </Card>

        <Button variant="outline" className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
          {done ? "Go to dashboard" : "Skip, start exploring"}
        </Button>
      </div>
    </div>
  );
}
