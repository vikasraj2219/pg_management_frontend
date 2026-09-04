import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, TrendingUp, Users, AlertTriangle } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

const STATUS_TONE = {
  trialing: "info",
  active: "success",
  past_due: "warning",
  suspended: "danger",
  cancelled: "default",
  no_subscription: "default",
};

// Platform superadmin section (spec §5.2) — support tooling, not
// customer-facing. Lives behind the same React app at /platform, gated to
// the platform_admin role by ProtectedRoute.
export default function PlatformAdmin() {
  const queryClient = useQueryClient();
  const [statusOrg, setStatusOrg] = useState(null);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async () => (await api.get("/platform/metrics")).data.data,
  });

  const { data: organizations, isLoading: orgsLoading } = useQuery({
    queryKey: ["platform-organizations"],
    queryFn: async () => (await api.get("/platform/organizations")).data.data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Platform overview</h1>
        <p className="text-sm text-muted-foreground">Every organization on the platform, at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MetricCard icon={TrendingUp} label="Total MRR" value={metricsLoading ? "…" : formatINR(metrics?.totalMrr)} />
        <MetricCard icon={Building2} label="Organizations" value={metricsLoading ? "…" : metrics?.totalOrganizations} />
        <MetricCard
          icon={Users}
          label="Active / Trialing"
          value={metricsLoading ? "…" : `${metrics?.statusCounts?.active || 0} / ${metrics?.statusCounts?.trialing || 0}`}
        />
        <MetricCard
          icon={AlertTriangle}
          label="Past due / Suspended"
          value={metricsLoading ? "…" : `${metrics?.statusCounts?.past_due || 0} / ${metrics?.statusCounts?.suspended || 0}`}
        />
      </div>

      <div className="space-y-2">
        {orgsLoading ? (
          <p className="text-sm text-muted-foreground">Loading organizations…</p>
        ) : (
          organizations?.map((org) => (
            <Card key={org.organizationId}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div>
                  <p className="text-sm font-medium">{org.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Signed up {new Date(org.signupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {org.bedCount} beds · {formatINR(org.mrrContribution)} MRR
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[org.planStatus] || "default"}>{org.planStatus}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setStatusOrg(org)}>
                    Change status
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {statusOrg && (
        <ChangeStatusDialog
          org={statusOrg}
          onClose={() => setStatusOrg(null)}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["platform-organizations"] });
            queryClient.invalidateQueries({ queryKey: ["platform-metrics"] });
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <Card>
      <CardContent className="space-y-1 pt-5">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
          <p className="text-xs">{label}</p>
        </div>
        <p className="font-display text-lg font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

const STATUSES = ["trialing", "active", "past_due", "suspended", "cancelled"];

function ChangeStatusDialog({ org, onClose, onChanged }) {
  const [status, setStatus] = useState(org.planStatus === "no_subscription" ? "trialing" : org.planStatus);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => (await api.post(`/platform/organizations/${org.organizationId}/status`, { status })).data,
    onSuccess: () => {
      onChanged();
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not update status"),
  });

  return (
    <Dialog open onClose={onClose} title={`${org.name} — manual status change`}>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Use this for support/manual-payment cases only — it's written to the audit log.
        </p>
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
