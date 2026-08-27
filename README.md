# Hostel & PG Management — Frontend (Phase 1)

React 18 + Vite + Tailwind CSS admin dashboard. Component patterns follow the
shadcn/ui approach (small, local `components/ui/*` primitives instead of a
component library dependency, so it stays token-driven and easy to theme).

This is **Phase 1 + Phase 2**: Authentication + Admin Layout + Dashboard, plus
Property + Building + Floor + Room + Bed management. The sidebar lists every
module from the full spec; Dashboard, Properties, and Rooms & Beds are live —
the rest are disabled "Soon" items with placeholder routes so the information
architecture is visible immediately and no route 404s as later phases land.

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

## Design tokens

Colors, radii and fonts are defined as CSS variables in `src/index.css` and
mapped into Tailwind via `tailwind.config.js` — change the palette in one
place. Fonts: **Space Grotesk** for headings/display, **Inter** for UI text,
**IBM Plex Mono** reserved for tabular/data values in later phases.

## Next phases

Phase 3 (Tenant + KYC + Documents) is next — add `pages/Tenants.jsx` and
`pages/Documents.jsx` (replacing their `ComingSoon` routes in `App.jsx`),
backed by TanStack Query calls into the corresponding backend routes.
