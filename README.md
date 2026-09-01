# Hostel & PG Management — Frontend (Phase 1-9)

React 18 + Vite + Tailwind CSS admin dashboard. Component patterns follow the
shadcn/ui approach (small, local `components/ui/*` primitives instead of a
component library dependency, so it stays token-driven and easy to theme).

This covers **Phase 1** (Auth + Layout + Dashboard), **Phase 2** (Property +
Building + Floor + Room + Bed), **Phase 3** (Tenant + KYC + Documents),
**Phase 4** (Check-in + Agreements + Assets), **Phase 5** (Billing +
Invoices + Payments + Deposits), **Phase 6** (Checkout + Settlement),
**Phase 7** (Expenses + Electricity), **Phase 8** (Maintenance + Staff),
and **Phase 9** (Food/Mess + Visitors + Notices). The sidebar lists every
module from the full spec; every item is now live except Reports, Audit
Log, and Settings (Phase 10). Checkout itself isn't a separate nav item
(mirroring the spec, which treats it as a workflow, not a module) — it's
reached from a tenant's "Room & Bed" tab.

## Setup

```bash
cd frontend
cp .env.example .env     # optional — defaults to same-origin /api via the dev proxy
npm install
npm run dev               # http://localhost:5173
```

Make sure the backend is running on http://localhost:5000 (see ../backend/README.md).
The Vite dev server proxies `/api/*` to it, so no CORS config is needed locally.

## Structure

```
src/
  components/ui/         Button, Card, Input, Label, Select, Dialog, Badge — small local primitives
  components/layout/     Sidebar, Topbar, DashboardLayout (shell)
  components/dashboard/  StatCard, RevenueChart, OccupancyChart
  components/rooms/      BedPill — the occupancy-grid visual unit (spec section 4)
  components/tenants/    AssignBedPanel, TenantDocuments, CheckInWizard, CheckoutWizard
  components/billing/    TenantLedgerPanel — read-only ledger summary shown in tenant detail
  context/AuthContext.jsx  Auth state, login/logout/register calls
  routes/ProtectedRoute.jsx  Redirects to /login when signed out
  pages/                  Login, RegisterOwner, Dashboard, Properties, RoomsBeds, Tenants, Documents, Billing, Payments, Assets, Expenses, Maintenance, Staff, Food, Visitors, Notices, ComingSoon, NotFound
  lib/api.js              Axios instance (cookie-based auth + Bearer fallback)
  lib/utils.js             cn() className helper
  App.jsx                  Route table
```

## Phase 2 pages

- **Properties** (`/properties`) — card grid of properties with a live bed-occupancy summary per card; "Add property" opens a form dialog.
- **Rooms & Beds** (`/rooms?property=<id>`) — property picker, rooms grouped by floor, each rendered as a colored bed grid (🟢 available / 🔴 occupied / 🟡 notice period / 🔵 maintenance / blocked / reserved) matching the spec's example. "Add room" walks through building → floor → room in one dialog, creating a building/floor inline if none exist yet, and auto-generates the room's beds from its capacity. Clicking a non-occupied bed opens a quick status-change dialog; occupied beds explain that changes go through checkout (coming in a later phase).

## Phase 3 pages

- **Tenants** (`/tenants`) — searchable, filterable, paginated tenant list. "Add tenant" captures the core spec-section-5 fields. Clicking a tenant opens a detail dialog with three tabs:
  - *Profile* — all tenant fields.
  - *Room & Bed* — assign a bed (property → available-bed picker) if unassigned, or vacate if assigned.
  - *KYC & Documents* — upload a document (type + file), preview, verify, or reject inline.
- **KYC & Documents** (`/documents`) — an org-wide review queue across every tenant, filterable by status, with the same preview/verify/reject actions.

## Phase 4 pages

- **Check-in wizard** (`components/tenants/CheckInWizard.jsx`) — a 5-step dialog (Room & Bed → Rent & Agreement → Assets → Meter & Condition → Confirm) opened from a tenant's "Check in" button on the Tenants list, or from the "Room & Bed" tab of a tenant's detail view. Submits everything in one call to `POST /api/checkins`, which allocates the bed, creates the agreement, assigns selected assets, and records the meter reading/room condition.
- **Inventory & Assets** (`/assets`) — filterable inventory grid (property, category, status) with "Add asset", plus per-item Return / Repair / Retire actions.

## Phase 5 pages

- **Billing & Ledger** (`/billing`) — filterable invoice list, "Generate monthly invoices" (property + month/year, reports created/skipped counts), and an invoice detail dialog to add charges, view the subtotal/discount/late-fee breakdown, and record a payment inline.
- **Payments & Deposits** (`/payments`) — tabbed page: a global payments list with "Record payment" (tenant → optional invoice → amount/method/transaction ID), and a deposits tab showing required/collected/refundable per tenant with a deduction-adding dialog.
- The tenant detail dialog (Tenants page) gains a **Billing** tab showing the computed ledger — total charged, total paid, outstanding balance, and invoice history.

## Phase 6 pages

- **Checkout wizard** (`components/tenants/CheckoutWizard.jsx`) — a 5-step dialog (Review → Final Charges → Assets → Condition & Damage → Settle & Confirm) opened from the "Room & Bed" tab of a tenant who currently has a bed. Shows pending rent and notice-period status upfront, lets you add last-mile charges, mark each assigned asset's return condition, log room-condition notes and a damage charge, then previews the deposit settlement math live before submitting to `POST /api/checkouts` — which settles invoices, releases the bed, and marks the tenant checked out in one call.

## Phase 7 pages

- **Expenses & Electricity** (`/expenses`) — tabbed page: an Expenses tab (filterable list with a running total, "Add expense" with an optional bill/receipt upload) and a Meters tab (add a meter, click into it for its full reading history plus a form to record a new one — units and total are always shown as computed, never editable).
- The dashboard's "Monthly expenses" card now links here instead of the not-yet-built Reports page.

## Phase 8 pages

- **Maintenance** (`/maintenance`) — filterable ticket list (property, status), "New ticket" with up to 5 photo uploads, and a ticket detail dialog to change status, assign staff, record cost, and see the full status-change history. The dashboard's "Open maintenance tickets" card links here.
- **Staff** (`/staff`) — filterable staff directory (property, role) with "Add staff" and a "Mark inactive" action per card.

## Phase 9 pages

- **Food / Mess** (`/food`) — a Weekly menu tab (property + week picker, click any meal slot to edit its items inline) and a Feedback & complaints tab surfacing tenant ratings/comments/complaints across meal records.
- **Visitors** (`/visitors`) — "currently inside" toggle, "Log visitor" entry form, and a one-click checkout action per visitor. The dashboard's "Today's visitors" card links here.
- **Notices** (`/notices`) — "New notice" with an audience picker (all tenants, property, floor, room, or hand-picked tenants) that reveals the right follow-up fields per scope.

## Next phases

Phase 10 (Reports + Analytics + Settings + Audit Logs) is the last phase —
add `pages/Reports.jsx`, `pages/AuditLog.jsx`, and `pages/Settings.jsx`.

## Design tokens

Colors, radii and fonts are defined as CSS variables in `src/index.css` and
mapped into Tailwind via `tailwind.config.js` — change the palette in one
place. Fonts: **Space Grotesk** for headings/display, **Inter** for UI text,
**IBM Plex Mono** reserved for tabular/data values in later phases.
