# Hostel & PG Management — Frontend (Phase 1)

React 18 + Vite + Tailwind CSS admin dashboard. Component patterns follow the
shadcn/ui approach (small, local `components/ui/*` primitives instead of a
component library dependency, so it stays token-driven and easy to theme).

This is **Phase 1 + Phase 2 + Phase 3**: Authentication + Admin Layout +
Dashboard, Property + Building + Floor + Room + Bed management, and Tenant +
KYC + Document management. The sidebar lists every module from the full
spec; Dashboard, Properties, Rooms & Beds, Tenants, and KYC & Documents are
live — the rest are disabled "Soon" items with placeholder routes.

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
  context/AuthContext.jsx  Auth state, login/logout/register calls
  routes/ProtectedRoute.jsx  Redirects to /login when signed out
  pages/                  Login, RegisterOwner, Dashboard, Properties, RoomsBeds, ComingSoon, NotFound
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

## Next phases

Phase 4 (Check-in + Room Allocation + Agreements + Assets) is next — add
`pages/CheckIn.jsx` (replacing its `ComingSoon` route in `App.jsx`), building
on the bed-assignment flow Tenants already uses.

## Design tokens

Colors, radii and fonts are defined as CSS variables in `src/index.css` and
mapped into Tailwind via `tailwind.config.js` — change the palette in one
place. Fonts: **Space Grotesk** for headings/display, **Inter** for UI text,
**IBM Plex Mono** reserved for tabular/data values in later phases.
