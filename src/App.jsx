import { Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import PlatformLayout from "@/components/layout/PlatformLayout";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import RegisterOwner from "@/pages/RegisterOwner";
import OnboardingBilling from "@/pages/OnboardingBilling";
import Dashboard from "@/pages/Dashboard";
import Properties from "@/pages/Properties";
import RoomsBeds from "@/pages/RoomsBeds";
import Tenants from "@/pages/Tenants";
import Documents from "@/pages/Documents";
import Billing from "@/pages/Billing";
import Payments from "@/pages/Payments";
import Assets from "@/pages/Assets";
import Expenses from "@/pages/Expenses";
import Maintenance from "@/pages/Maintenance";
import Staff from "@/pages/Staff";
import Food from "@/pages/Food";
import Visitors from "@/pages/Visitors";
import Notices from "@/pages/Notices";
import Reports from "@/pages/Reports";
import AuditLog from "@/pages/AuditLog";
import Settings from "@/pages/Settings";
import PlatformAdmin from "@/pages/PlatformAdmin";
import NotFound from "@/pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register-owner" element={<RegisterOwner />} />

      <Route
        path="/onboarding/billing"
        element={
          <ProtectedRoute>
            <OnboardingBilling />
          </ProtectedRoute>
        }
      />

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
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/assets" element={<Assets />} />
        <Route path="/food" element={<Food />} />
        <Route path="/visitors" element={<Visitors />} />
        <Route path="/notices" element={<Notices />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/audit-log" element={<AuditLog />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/platform" element={<PlatformAdmin />} />
      </Route>

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "platform_admin" ? "/platform" : "/dashboard"} replace />;
}
