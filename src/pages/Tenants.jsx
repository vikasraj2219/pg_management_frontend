import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Users, Phone, Mail, BedDouble, ArrowLeftRight, LogOut as VacateIcon } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import TenantDocuments from "@/components/tenants/TenantDocuments";
import AssignBedPanel from "@/components/tenants/AssignBedPanel";
import CheckInWizard from "@/components/tenants/CheckInWizard";
import TenantLedgerPanel from "@/components/billing/TenantLedgerPanel";

const STATUS_TONE = { active: "success", notice_period: "warning", checked_out: "default", suspended: "danger", archived: "default" };
const STATUS_LABEL = { active: "Active", notice_period: "Notice period", checked_out: "Checked out", suspended: "Suspended", archived: "Archived" };

const emptyForm = {
  fullName: "",
  phone: "",
  email: "",
  gender: "",
  occupation: "",
  collegeOrCompany: "",
  joiningDate: "",
  expectedCheckoutDate: "",
  rent: "",
  deposit: "",
  permanentAddress: "",
  currentAddress: "",
  notes: "",
};

export default function Tenants() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [activeTenantId, setActiveTenantId] = useState(null);
  const [checkInTenant, setCheckInTenant] = useState(null); // { _id, fullName }

  const { data, isLoading } = useQuery({
    queryKey: ["tenants", search, status, page],
    queryFn: async () =>
      (
        await api.get("/tenants", {
          params: { search: search || undefined, status: status || undefined, page, limit: 12 },
        })
      ).data,
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => (await api.post("/tenants", payload)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
      setAddOpen(false);
      setForm(emptyForm);
      setFormError("");
    },
    onError: (err) => setFormError(err.response?.data?.message || "Could not add tenant"),
  });

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Tenants</h1>
          <p className="text-sm text-muted-foreground">Every tenant across your properties.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add tenant
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
        </div>
        <Select
          className="sm:w-48"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {Object.keys(STATUS_LABEL).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : data?.data?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Users className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No tenants match your search yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data?.map((tenant) => (
              <Card key={tenant._id} className="cursor-pointer hover:shadow-md" onClick={() => setActiveTenantId(tenant._id)}>
                <CardContent className="space-y-2.5 pt-5">
                  <div className="flex items-start justify-between">
                    <p className="font-display font-semibold">{tenant.fullName}</p>
                    <Badge tone={STATUS_TONE[tenant.status]}>{STATUS_LABEL[tenant.status]}</Badge>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    {tenant.phone}
                  </p>
                  {tenant.email && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      {tenant.email}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 border-t border-border pt-2.5 text-xs text-muted-foreground">
                    <BedDouble className="h-3.5 w-3.5" />
                    {tenant.currentBed ? `Room ${tenant.currentBed.room?.roomNumber} · Bed ${tenant.currentBed.label}` : "No bed assigned"}
                  </div>
                  {!tenant.currentBed && tenant.status !== "checked_out" && tenant.status !== "archived" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCheckInTenant({ _id: tenant._id, fullName: tenant.fullName });
                      }}
                    >
                      Check in
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {data?.pages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {data.page} of {data.pages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add tenant" description="Basic tenant details. Bed assignment and KYC can be done right after.">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}
          className="space-y-4"
        >
          {formError && <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{formError}</div>}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input id="fullName" required value={form.fullName} onChange={update("fullName")} placeholder="Rahul Sharma" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" required value={form.phone} onChange={update("phone")} placeholder="98765 43210" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender</Label>
              <Select id="gender" value={form.gender} onChange={update("gender")}>
                <option value="">Select…</option>
                {["Male", "Female", "Other"].map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="occupation">Occupation</Label>
              <Input id="occupation" value={form.occupation} onChange={update("occupation")} placeholder="Student / Working" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="collegeOrCompany">College / Company</Label>
              <Input id="collegeOrCompany" value={form.collegeOrCompany} onChange={update("collegeOrCompany")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="joiningDate">Joining date</Label>
              <Input id="joiningDate" type="date" value={form.joiningDate} onChange={update("joiningDate")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expectedCheckoutDate">Expected checkout</Label>
              <Input id="expectedCheckoutDate" type="date" value={form.expectedCheckoutDate} onChange={update("expectedCheckoutDate")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rent">Rent (₹/month)</Label>
              <Input id="rent" type="number" min={0} value={form.rent} onChange={update("rent")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit">Deposit (₹)</Label>
              <Input id="deposit" type="number" min={0} value={form.deposit} onChange={update("deposit")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="permanentAddress">Permanent address</Label>
            <Textarea id="permanentAddress" value={form.permanentAddress} onChange={update("permanentAddress")} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding…" : "Add tenant"}
            </Button>
          </div>
        </form>
      </Dialog>

      {activeTenantId && <TenantDetailDialog tenantId={activeTenantId} onClose={() => setActiveTenantId(null)} />}

      {checkInTenant && (
        <CheckInWizard
          tenantId={checkInTenant._id}
          tenantName={checkInTenant.fullName}
          onClose={() => setCheckInTenant(null)}
          onCompleted={() => {
            queryClient.invalidateQueries({ queryKey: ["tenants"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
          }}
        />
      )}
    </div>
  );
}

function TenantDetailDialog({ tenantId, onClose }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("profile");
  const [showWizard, setShowWizard] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ["tenant", tenantId],
    queryFn: async () => (await api.get(`/tenants/${tenantId}`)).data.data,
  });

  const vacateMutation = useMutation({
    mutationFn: async () => (await api.post(`/tenants/${tenantId}/vacate-bed`)).data.data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });

  return (
    <Dialog open onClose={onClose} className="max-w-2xl" title={isLoading ? "Loading…" : tenant?.fullName}>
      {!isLoading && (
        <>
          <div className="mb-4 flex gap-1 border-b border-border">
            {[
              { id: "profile", label: "Profile" },
              { id: "bed", label: "Room & Bed" },
              { id: "documents", label: "KYC & Documents" },
              { id: "billing", label: "Billing" },
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

          {tab === "profile" && (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Field label="Phone" value={tenant.phone} />
              <Field label="Email" value={tenant.email} />
              <Field label="Gender" value={tenant.gender} />
              <Field label="Occupation" value={tenant.occupation} />
              <Field label="College / Company" value={tenant.collegeOrCompany} />
              <Field label="Property" value={tenant.property?.name} />
              <Field label="Joining date" value={formatDate(tenant.joiningDate)} />
              <Field label="Expected checkout" value={formatDate(tenant.expectedCheckoutDate)} />
              <Field label="Rent" value={tenant.rent ? `₹${tenant.rent}/mo` : "—"} />
              <Field label="Deposit" value={tenant.deposit ? `₹${tenant.deposit}` : "—"} />
              <Field label="Address" value={tenant.permanentAddress} full />
              <Field label="Notes" value={tenant.notes} full />
            </dl>
          )}

          {tab === "bed" &&
            (tenant.currentBed ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-md border border-border p-3">
                  <div>
                    <p className="font-medium">
                      Room {tenant.currentBed.room?.roomNumber} · Bed {tenant.currentBed.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{tenant.property?.name}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => vacateMutation.mutate()}
                    disabled={vacateMutation.isPending}
                  >
                    <VacateIcon className="h-3.5 w-3.5" />
                    Vacate
                  </Button>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  Room transfers are available from the Rooms &amp; Beds page.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <AssignBedPanel tenantId={tenantId} onAssigned={() => queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] })} />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  or
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" className="w-full" onClick={() => setShowWizard(true)}>
                  Run full check-in (agreement, assets, meter reading)
                </Button>
              </div>
            ))}

          {tab === "documents" && <TenantDocuments tenantId={tenantId} />}
          {tab === "billing" && <TenantLedgerPanel tenantId={tenantId} />}
        </>
      )}

      {showWizard && (
        <CheckInWizard
          tenantId={tenantId}
          tenantName={tenant?.fullName}
          onClose={() => setShowWizard(false)}
          onCompleted={() => queryClient.invalidateQueries({ queryKey: ["tenant", tenantId] })}
        />
      )}
    </Dialog>
  );
}

function Field({ label, value, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value || "—"}</dd>
    </div>
  );
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
