import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck2, Check, X, Eye } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE = { pending: "warning", verified: "success", rejected: "danger" };

export default function Documents() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("pending");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", "all", status],
    queryFn: async () => (await api.get("/documents", { params: { status: status || undefined } })).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
  };

  const verifyMutation = useMutation({
    mutationFn: async (id) => (await api.put(`/documents/${id}/verify`)).data.data,
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => (await api.put(`/documents/${id}/reject`, { reason: "Document unclear or invalid" })).data.data,
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">KYC &amp; Documents</h1>
          <p className="text-sm text-muted-foreground">Review and verify tenant identity documents.</p>
        </div>
        <Select className="w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="verified">Verified</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : documents?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <FileCheck2 className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nothing here — new uploads from tenant records will show up.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc._id}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {doc.tenant?.fullName} <span className="font-normal text-muted-foreground">· {doc.documentType}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{doc.tenant?.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[doc.status]}>{doc.status}</Badge>
                  <a href={`${import.meta.env.VITE_API_URL || "/api"}/documents/${doc._id}/file`} target="_blank" rel="noreferrer">
                    <Button variant="ghost" size="icon" title="Preview">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </a>
                  {doc.status !== "verified" && (
                    <Button variant="ghost" size="icon" title="Verify" onClick={() => verifyMutation.mutate(doc._id)}>
                      <Check className="h-4 w-4 text-success" />
                    </Button>
                  )}
                  {doc.status !== "rejected" && (
                    <Button variant="ghost" size="icon" title="Reject" onClick={() => rejectMutation.mutate(doc._id)}>
                      <X className="h-4 w-4 text-danger" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
