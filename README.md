# Hostel & PG Management — Frontend (Phase 1)

React 18 + Vite + Tailwind CSS admin dashboard. Component patterns follow the
shadcn/ui approach (small, local `components/ui/*` primitives instead of a
component library dependency, so it stays token-driven and easy to theme).

This is **Phase 1**: Authentication + Admin Layout + Dashboard shell, matching
the backend's Phase 1 scope. The sidebar already lists every module from the
full spec (Properties, Rooms & Beds, Tenants, Billing, Maintenance, etc.) as
disabled "Soon" items, and each has a placeholder route — so the information
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
  components/ui/         Button, Card, Input, Label — small local primitives
  components/layout/     Sidebar, Topbar, DashboardLayout (shell)
  components/dashboard/  StatCard, RevenueChart, OccupancyChart
  context/AuthContext.jsx  Auth state, login/logout/register calls
  routes/ProtectedRoute.jsx  Redirects to /login when signed out
  pages/                  Login, RegisterOwner, Dashboard, ComingSoon, NotFound
  lib/api.js              Axios instance (cookie-based auth + Bearer fallback)
  lib/utils.js             cn() className helper
  App.jsx                  Route table
```

## Design tokens

Colors, radii and fonts are defined as CSS variables in `src/index.css` and
mapped into Tailwind via `tailwind.config.js` — change the palette in one
place. Fonts: **Space Grotesk** for headings/display, **Inter** for UI text,
**IBM Plex Mono** reserved for tabular/data values in later phases.

## Next phases

Each new module gets its own `pages/<Module>.jsx` (replacing the matching
`ComingSoon` route in `App.jsx`), backed by TanStack Query calls into the
corresponding backend route added per the phase plan.
