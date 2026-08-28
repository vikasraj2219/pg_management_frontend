# Hostel & PG Management — Frontend (Phase 1-4)

React 18 + Vite + Tailwind CSS admin dashboard. Component patterns follow the
shadcn/ui approach (small, local `components/ui/*` primitives instead of a
component library dependency, so it stays token-driven and easy to theme).

This covers **Phase 1** (Auth + Layout + Dashboard), **Phase 2** (Property +
Building + Floor + Room + Bed), **Phase 3** (Tenant + KYC + Documents), and
**Phase 4** (Check-in + Agreements + Assets). The sidebar lists every module
from the full spec; Dashboard, Properties, Rooms & Beds, Tenants, KYC &
Documents, and Inventory & Assets are live — the rest are disabled "Soon"
items with placeholder routes.

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
  components/tenants/    AssignBedPanel, TenantDocuments, CheckInWizard
  context/AuthContext.jsx  Auth state, login/logout/register calls
  routes/ProtectedRoute.jsx  Redirects to /login when signed out
  pages/                  Login, RegisterOwner, Dashboard, Properties, RoomsBeds, Tenants, Documents, Assets, ComingSoon, NotFound
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

## Next phases

Phase 5 (Rent + Billing + Invoice + Ledger + Payments + Deposits) is next —
add `pages/Billing.jsx` and `pages/Payments.jsx` (replacing their
`ComingSoon` routes in `App.jsx`), building on the rent/deposit data the
check-in flow already snapshots onto each tenant.

## Design tokens

Colors, radii and fonts are defined as CSS variables in `src/index.css` and
mapped into Tailwind via `tailwind.config.js` — change the palette in one
place. Fonts: **Space Grotesk** for headings/display, **Inter** for UI text,
**IBM Plex Mono** reserved for tabular/data values in later phases.
