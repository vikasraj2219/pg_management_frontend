import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Accepts data of shape [{ month, revenue, expenses }]. Empty until Billing
// (Phase 5) and Expenses (Phase 7) modules populate the dashboard aggregation.
export default function RevenueChart({ data = [] }) {
  const isEmpty = data.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground">Revenue vs Expenses</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        {isEmpty ? (
          <EmptyChartState message="Revenue and expense trends will appear once billing data comes in." />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 10, top: 5, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="expenses" stroke="hsl(var(--accent))" fill="url(#expFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyChartState({ message }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
