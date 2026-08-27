import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Login from "@/pages/Login";
import RegisterOwner from "@/pages/RegisterOwner";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import RoomsBeds from "@/pages/RoomsBeds";
import ComingSoon from "@/pages/ComingSoon";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register-owner" element={<RegisterOwner />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/properties" element={<Properties />} />
        <Route path="/rooms" element={<RoomsBeds />} />

        {/* Placeholders for later phases (spec sections 5-26) so routing/nav
            structure exists from Phase 1 without faking functionality. */}
        <Route path="/tenants" element={<ComingSoon title="Tenants" />} />
        <Route path="/documents" element={<ComingSoon title="KYC & Documents" />} />
        <Route path="/billing" element={<ComingSoon title="Billing & Ledger" />} />
        <Route path="/payments" element={<ComingSoon title="Payments & Deposits" />} />
        <Route path="/maintenance" element={<ComingSoon title="Maintenance" />} />
        <Route path="/staff" element={<ComingSoon title="Staff" />} />
        <Route path="/assets" element={<ComingSoon title="Inventory & Assets" />} />
        <Route path="/food" element={<ComingSoon title="Food / Mess" />} />
        <Route path="/visitors" element={<ComingSoon title="Visitors" />} />
        <Route path="/notices" element={<ComingSoon title="Notices" />} />
        <Route path="/reports" element={<ComingSoon title="Reports" />} />
        <Route path="/audit-log" element={<ComingSoon title="Audit Log" />} />
        <Route path="/settings" element={<ComingSoon title="Settings" />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
