import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, MessageSquare } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const MEAL_TYPES = ["Breakfast", "Lunch", "Snacks", "Dinner"];

function startOfWeek(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export default function Food() {
  const [tab, setTab] = useState("menu");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Food / Mess</h1>
        <p className="text-sm text-muted-foreground">Weekly menu, meal feedback, and complaints.</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {[
          { id: "menu", label: "Weekly menu" },
          { id: "feedback", label: "Feedback & complaints" },
        ].map((t) => (
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

      {tab === "menu" ? <MenuTab /> : <FeedbackTab />}
    </div>
  );
}

function MenuTab() {
  const queryClient = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState("");
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [editSlot, setEditSlot] = useState(null);

  const { data: properties } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => (await api.get("/properties")).data.data,
  });

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekEnd = weekDays[6];

  const { data: menu, isLoading } = useQuery({
    queryKey: ["menu", propertyFilter, weekStart.toISOString()],
    queryFn: async () =>
      (
        await api.get("/food/menu", {
          params: { property: propertyFilter || undefined, from: weekStart.toISOString(), to: weekEnd.toISOString() },
        })
      ).data.data,
    enabled: !!propertyFilter,
  });

  const menuBySlot = {};
  for (const m of menu || []) {
    const key = `${new Date(m.date).toDateString()}-${m.mealType}`;
    menuBySlot[key] = m;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select className="w-52" value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}>
          <option value="">Select property…</option>
          {properties?.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2 text-sm">
          <Button variant="outline" size="sm" onClick={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))}>
            ← Prev week
          </Button>
          <span className="text-muted-foreground">
            {weekStart.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} –{" "}
            {weekEnd.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
          </span>
          <Button variant="outline" size="sm" onClick={() => setWeekStart((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))}>
            Next week →
          </Button>
        </div>
      </div>

      {!propertyFilter ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Select a property to view its weekly menu.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="w-24 p-2 text-left text-xs font-medium text-muted-foreground"></th>
                {weekDays.map((d) => (
                  <th key={d.toISOString()} className="p-2 text-left text-xs font-medium text-muted-foreground">
                    {d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEAL_TYPES.map((mealType) => (
                <tr key={mealType}>
                  <td className="p-2 text-xs font-medium text-muted-foreground">{mealType}</td>
                  {weekDays.map((d) => {
                    const slot = menuBySlot[`${d.toDateString()}-${mealType}`];
                    return (
                      <td key={d.toISOString()} className="p-1 align-top">
                        <button
                          onClick={() => setEditSlot({ date: d, mealType, existing: slot })}
                          className="min-h-16 w-full rounded-md border border-border p-2 text-left text-xs hover:bg-muted"
                        >
                          {slot?.items?.length ? slot.items.join(", ") : <span className="text-muted-foreground">+ Add items</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editSlot && (
        <EditMenuSlotDialog
          property={propertyFilter}
          slot={editSlot}
          onClose={() => setEditSlot(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["menu"] })}
        />
      )}
    </div>
  );
}

function EditMenuSlotDialog({ property, slot, onClose, onSaved }) {
  const [items, setItems] = useState(slot.existing?.items?.join(", ") || "");
  const [notes, setNotes] = useState(slot.existing?.notes || "");
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () =>
      (
        await api.post("/food/menu", {
          property,
          date: slot.date.toISOString(),
          mealType: slot.mealType,
          items: items
            .split(",")
            .map((i) => i.trim())
            .filter(Boolean),
          notes,
        })
      ).data.data,
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => setError(err.response?.data?.message || "Could not save menu"),
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${slot.mealType} — ${slot.date.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}`}
    >
      <div className="space-y-4">
        {error && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}
        <div className="space-y-1.5">
          <Label>Items (comma-separated)</Label>
          <Textarea rows={3} value={items} onChange={(e) => setItems(e.target.value)} placeholder="Rice, Dal, Roti, Sabzi" />
        </div>
        <div className="space-y-1.5">
          <Label>Notes</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
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

function FeedbackTab() {
  const { data: meals, isLoading } = useQuery({
    queryKey: ["meals-feedback"],
    queryFn: async () => (await api.get("/food/meals")).data.data,
  });

  const withFeedback = (meals || []).filter((m) => m.feedbackRating || m.feedbackComment || m.complaint);

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="h-40 animate-pulse rounded-lg border border-border bg-muted" />
      ) : withFeedback.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-14 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No feedback or complaints recorded yet.</p>
          </CardContent>
        </Card>
      ) : (
        withFeedback.map((m) => (
          <Card key={m._id}>
            <CardContent className="space-y-1 py-3.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {m.tenant?.fullName} · {m.mealType}
                </p>
                <div className="flex items-center gap-2">
                  {m.feedbackRating && <Badge tone="info">{m.feedbackRating}★</Badge>}
                  {m.complaint && <Badge tone="danger">Complaint</Badge>}
                </div>
              </div>
              {m.feedbackComment && <p className="text-xs text-muted-foreground">{m.feedbackComment}</p>}
              {m.complaint && <p className="text-xs text-danger">{m.complaint}</p>}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
