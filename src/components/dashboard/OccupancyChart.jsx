import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyChartState } from "./RevenueChart";

// Accepts data of shape [{ month, occupancyPercent }]. Populated once
// Property/Room/Bed models (Phase 2) exist and beds carry a real status.
export default function OccupancyChart({ data = [] }) {
  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Occupancy Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {isEmpty ? (
          <EmptyChartState message="Occupancy trends will appear once properties and beds are set up." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
              <Tooltip />
              <Bar dataKey="occupancyPercent" fill="hsl(var(--info))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
