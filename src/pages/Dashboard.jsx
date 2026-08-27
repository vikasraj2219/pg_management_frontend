import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  BedDouble,
  IndianRupee,
  AlertTriangle,
  Users,
  UserPlus,
  LogIn,
  LogOut,
  Wrench,
  FileCheck2,
  ScanFace,
  ListTodo,
} from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import StatCard from "@/components/dashboard/StatCard";
import RevenueChart from "@/components/dashboard/RevenueChart";
import OccupancyChart from "@/components/dashboard/OccupancyChart";

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data.data,
  });

  const property = data?.propertyOverview;
  const financial = data?.financialOverview;
  const tenant = data?.tenantOverview;
  const ops = data?.operations;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">
          {greeting()}, {user?.name?.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground">Here's how your properties are doing today.</p>
      </div>

      <section>
        <SectionLabel>Property overview</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={Building2}
            label="Total properties"
            value={isLoading ? "—" : property?.totalProperties ?? 0}
            onClick={() => navigate("/properties")}
          />
          <StatCard
            icon={BedDouble}
            label="Occupied / total beds"
            value={isLoading ? "—" : `${property?.occupiedBeds ?? 0} / ${property?.totalBeds ?? 0}`}
            hint={`${property?.availableBeds ?? 0} available`}
            tone="info"
            onClick={() => navigate("/rooms")}
          />
          <StatCard
            icon={BedDouble}
            label="Occupancy"
            value={isLoading ? "—" : `${property?.occupancyPercent ?? 0}%`}
            tone="success"
            onClick={() => navigate("/rooms")}
          />
          <StatCard
            icon={AlertTriangle}
            label="Beds under maintenance"
            value={isLoading ? "—" : property?.maintenanceBeds ?? 0}
            tone="warning"
            onClick={() => navigate("/rooms")}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Financial overview</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            icon={IndianRupee}
            label="Today's collection"
            value={isLoading ? "—" : formatINR(financial?.todaysCollection)}
            tone="success"
            onClick={() => navigate("/payments")}
          />
          <StatCard
            icon={IndianRupee}
            label="Monthly collection"
            value={isLoading ? "—" : formatINR(financial?.monthlyCollection)}
            onClick={() => navigate("/payments")}
          />
          <StatCard
            icon={IndianRupee}
            label="Net revenue (this month)"
            value={isLoading ? "—" : formatINR(financial?.netRevenue)}
            onClick={() => navigate("/reports")}
          />
          <StatCard
            icon={AlertTriangle}
            label="Pending rent"
            value={isLoading ? "—" : formatINR(financial?.pendingRent)}
            tone="warning"
            onClick={() => navigate("/billing")}
          />
          <StatCard
            icon={AlertTriangle}
            label="Overdue rent"
            value={isLoading ? "—" : formatINR(financial?.overdueRent)}
            tone="danger"
            onClick={() => navigate("/billing")}
          />
          <StatCard
            icon={IndianRupee}
            label="Monthly expenses"
            value={isLoading ? "—" : formatINR(financial?.monthlyExpenses)}
            onClick={() => navigate("/reports")}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Tenants</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Active tenants" value={isLoading ? "—" : tenant?.totalActiveTenants ?? 0} onClick={() => navigate("/tenants")} />
          <StatCard icon={UserPlus} label="New tenants" value={isLoading ? "—" : tenant?.newTenants ?? 0} tone="info" onClick={() => navigate("/tenants")} />
          <StatCard icon={LogIn} label="Today's check-ins" value={isLoading ? "—" : tenant?.todaysCheckins ?? 0} tone="success" onClick={() => navigate("/tenants")} />
          <StatCard icon={LogOut} label="Upcoming check-outs" value={isLoading ? "—" : tenant?.upcomingCheckouts ?? 0} onClick={() => navigate("/tenants")} />
          <StatCard icon={AlertTriangle} label="In notice period" value={isLoading ? "—" : tenant?.tenantsInNoticePeriod ?? 0} tone="warning" onClick={() => navigate("/tenants")} />
        </div>
      </section>

      <section>
        <SectionLabel>Operations</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Wrench} label="Open maintenance tickets" value={isLoading ? "—" : ops?.openMaintenanceTickets ?? 0} tone="warning" onClick={() => navigate("/maintenance")} />
          <StatCard icon={FileCheck2} label="Pending KYC" value={isLoading ? "—" : ops?.pendingKyc ?? 0} onClick={() => navigate("/documents")} />
          <StatCard icon={ScanFace} label="Today's visitors" value={isLoading ? "—" : ops?.todaysVisitors ?? 0} tone="info" onClick={() => navigate("/visitors")} />
          <StatCard icon={ListTodo} label="Pending tasks" value={isLoading ? "—" : ops?.pendingTasks ?? 0} onClick={() => navigate("/reports")} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RevenueChart data={data?.charts?.monthlyRevenue?.map((r, i) => ({ ...r })) || []} />
        <OccupancyChart data={data?.charts?.occupancy || []} />
      </section>
    </div>
  );
}

function SectionLabel({ children }) {
  return <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
