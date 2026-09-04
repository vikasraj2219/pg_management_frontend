import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// App-wide banner for trial/past_due/suspended states (spec §5.3). Platform
// admins aren't scoped to an organization, so they never see this.
export default function SubscriptionBanner() {
  const { user } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: async () => (await api.get("/billing/subscription")).data.data,
    enabled: user?.role !== "platform_admin",
    staleTime: 60 * 1000,
    retry: false,
  });

  if (!subscription || user?.role === "platform_admin") return null;

  if (subscription.status === "trialing") {
    const daysLeft = Math.max(
      0,
      Math.ceil((new Date(subscription.trialEndsAt) - new Date()) / (24 * 60 * 60 * 1000))
    );
    return (
      <div className="flex items-center gap-2 border-b border-info/30 bg-info/10 px-4 py-2 text-sm text-info">
        <Clock className="h-4 w-4 shrink-0" />
        <span>
          {daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.` : "Your trial ends today."}
        </span>
        <Link to="/settings?tab=billing" className="ml-auto shrink-0 font-medium underline">
          Add payment method
        </Link>
      </div>
    );
  }

  if (subscription.status === "past_due" || subscription.status === "suspended") {
    const suspended = subscription.status === "suspended";
    return (
      <div
        className={`flex items-center gap-2 border-b px-4 py-2 text-sm ${
          suspended ? "border-danger/30 bg-danger/10 text-danger" : "border-warning/30 bg-warning/10 text-warning"
        }`}
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          {suspended
            ? "Your subscription is suspended due to non-payment. You can view your data, but changes are blocked until billing is fixed."
            : "Your last payment failed. Please update billing to avoid suspension."}
        </span>
        <Link to="/settings?tab=billing" className="ml-auto shrink-0 font-medium underline">
          Fix billing
        </Link>
      </div>
    );
  }

  return null;
}
