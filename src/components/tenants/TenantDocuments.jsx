import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, FileText, Check, X, Eye } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const DOCUMENT_TYPES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Driving License",
  "Voter ID",
  "College ID",
  "Employee ID",
  "Address Proof",
  "Photo",
  "Other",
];

const STATUS_TONE = { pending: "warning", verified: "success", rejected: "danger" };

export default function TenantDocuments({ tenantId }) {
  const queryClient = useQueryClient();
  const [docType, setDocType] = useState("Aadhaar");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", tenantId],
    queryFn: async () => (await api.get("/documents", { params: { tenant: tenantId } })).data.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents", tenantId] });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenantId", tenantId);
      formData.append("documentType", docType);
      return (await api.post("/documents", formData, { headers: { "Content-Type": "multipart/form-data" } })).data.data;
    },
    onSuccess: () => {
      setFile(null);
      setError("");
      invalidate();
    },
    onError: (err) => setError(err.response?.data?.message || "Upload failed"),
  });

  const verifyMutation = useMutation({
    mutationFn: async (id) => (await api.put(`/documents/${id}/verify`)).data.data,
    onSuccess: invalidate,
  });

  const rejectMutation = useMutation({
    mutationFn: async (id) => (await api.put(`/documents/${id}/reject`, { reason: "Document unclear or invalid" })).data.data,
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border p-3">
        <Select className="w-40" value={docType} onChange={(e) => setDocType(e.target.value)}>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="flex-1 text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium"
        />
        <Button size="sm" disabled={!file || uploadMutation.isPending} onClick={() => uploadMutation.mutate()}>
          <Upload className="h-3.5 w-3.5" />
          Upload
        </Button>
      </div>

      {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading documents…</p>
      ) : documents?.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FileText className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc._id} className="flex items-center justify-between rounded-md border border-border px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">{doc.documentType}</p>
                <p className="text-xs text-muted-foreground">{doc.fileName}</p>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
