import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const MODULES = ["Invoice", "Payment", "SecurityDeposit", "Tenant"];

export default function AuditLog() {
  const [moduleFilter, setModuleFilter] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", moduleFilter],
    queryFn: async () => (await api.get("/audit-logs", { params: { module: moduleFilter || undefined } })).data.data,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">Every important financial change, who made it, and when.</p>
      </div>

      <Select className="w-48" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
        <option value="">All modules</option>
        {MODULES.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </Select>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : logs?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No changes logged yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs?.map((log) => (
            <Card key={log._id}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm">
                    <span className="font-medium">{log.user?.name}</span> {log.action} <Badge tone="primary">{log.module}</Badge>
                    {log.recordLabel && <span className="text-muted-foreground"> · {log.recordLabel}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(log.date).toLocaleString("en-IN")}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
