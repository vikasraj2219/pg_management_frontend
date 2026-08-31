import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, Eye } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const CATEGORIES = ["Electrical", "Plumbing", "Internet", "AC", "Water", "Furniture", "Cleaning", "Other"];
const PRIORITIES = ["emergency", "high", "medium", "low"];
const STATUSES = ["created", "assigned", "in_progress", "waiting", "resolved", "closed"];
const STATUS_LABELS = { created: "Created", assigned: "Assigned", in_progress: "In progress", waiting: "Waiting", resolved: "Resolved", closed: "Closed" };
const STATUS_TONE = { created: "default", assigned: "info", in_progress: "primary", waiting: "warning", resolved: "success", closed: "default" };
const PRIORITY_TONE = { emergency: "danger", high: "warning", medium: "info", low: "default" };

export default function Maintenance() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [activeTicketId, setActiveTicketId] = useState(null);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["maintenance", propertyFilter, statusFilter],
    queryFn: async () =>
      (await api.get("/maintenance", { params: { property: propertyFilter || undefined, status: statusFilter || undefined } })).data.data,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Maintenance</h1>
          <p className="text-sm text-muted-foreground">Track and resolve maintenance tickets.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          New ticket
        </Button>
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
        <Select className="w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : tickets?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <Wrench className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tickets yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tickets?.map((t) => (
            <Card key={t._id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveTicketId(t._id)}>
              <CardContent className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium">
                    {t.category} {t.room ? <span className="font-normal text-muted-foreground">· Room {t.room.roomNumber}</span> : null}
                  </p>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{t.complaint}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
                  <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABELS[t.status]}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewTicketDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        properties={properties}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["maintenance"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
        }}
      />

      {activeTicketId && (
        <TicketDetailDialog
          ticketId={activeTicketId}
          onClose={() => setActiveTicketId(null)}
          onUpdated={() => {
            queryClient.invalidateQueries({ queryKey: ["maintenance"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
          }}
        />
      )}
    </div>
  );
}

function NewTicketDialog({ open, onClose, properties, onCreated }) {
  const [form, setForm] = useState({ property: "", category: "Electrical", priority: "medium", complaint: "" });
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => v && formData.append(k, v));
      files.forEach((f) => formData.append("images", f));
      return (await api.post("/maintenance", formData, { headers: { "Content-Type": "multipart/form-data" } })).data.data;
    },
    onSuccess: () => {
      onCreated();
      onClose();
      setForm({ property: "", category: "Electrical", priority: "medium", complaint: "" });
      setFiles([]);
      setError("");
    },
    onError: (err) => setError(err.response?.data?.message || "Could not create ticket"),
  });

  return (
    <Dialog open={open} onClose={onClose} title="New maintenance ticket">
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
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Priority</Label>
            <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Complaint</Label>
          <Textarea rows={3} required value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
        </div>

        <div className="space-y-1.5">
          <Label>Photos (optional)</Label>
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Creating…" : "Create ticket"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function TicketDetailDialog({ ticketId, onClose, onUpdated }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: async () => (await api.get(`/maintenance/${ticketId}`)).data.data,
  });

  const { data: staff } = useQuery({
    queryKey: ["staff", ticket?.property],
    queryFn: async () => (await api.get("/staff", { params: { property: ticket.property, status: "active" } })).data.data,
    enabled: !!ticket?.property,
  });

  const updateMutation = useMutation({
    mutationFn: async (payload) => (await api.put(`/maintenance/${ticketId}`, payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      onUpdated();
      setNote("");
    },
  });

  return (
    <Dialog open onClose={onClose} title={isLoading ? "Loading…" : ticket?.category} className="max-w-lg">
      {!isLoading && ticket && (
        <div className="space-y-4">
          <p className="text-sm">{ticket.complaint}</p>

          {ticket.images?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {ticket.images.map((_, i) => (
                <a key={i} href={`${import.meta.env.VITE_API_URL || "/api"}/maintenance/${ticketId}/images/${i}`} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm">
                    <Eye className="h-3.5 w-3.5" />
                    Photo {i + 1}
                  </Button>
                </a>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={ticket.status} onChange={(e) => updateMutation.mutate({ status: e.target.value, note })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned staff</Label>
              <Select
                value={ticket.assignedStaff?._id || ""}
                onChange={(e) => updateMutation.mutate({ assignedStaff: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {staff?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cost (₹)</Label>
            <Input
              type="number"
              min={0}
              defaultValue={ticket.cost}
              onBlur={(e) => e.target.value !== String(ticket.cost) && updateMutation.mutate({ cost: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Note for next status change</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional context for the status update above" />
          </div>

          {ticket.statusHistory?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">History</p>
              {ticket.statusHistory.map((h, i) => (
                <div key={i} className="rounded-md border border-border px-3 py-1.5 text-xs">
                  <span className="font-medium">{STATUS_LABELS[h.status]}</span>
                  {h.note ? ` — ${h.note}` : ""} · {new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
