import { cn } from "@/lib/utils";

// Maps directly to spec section 4's example grid (🟢 Available / 🔴 Occupied
// / 🟡 Notice Period / 🔵 Maintenance) plus reserved/blocked.
const STATUS_STYLES = {
  available: "bg-success/10 text-success border-success/30",
  occupied: "bg-danger/10 text-danger border-danger/30",
  notice_period: "bg-warning/10 text-warning border-warning/30",
  maintenance: "bg-info/10 text-info border-info/30",
  blocked: "bg-muted text-muted-foreground border-border",
  reserved: "bg-primary/10 text-primary border-primary/30",
};

const STATUS_LABELS = {
  available: "Available",
  occupied: "Occupied",
  notice_period: "Notice period",
  maintenance: "Maintenance",
  blocked: "Blocked",
  reserved: "Reserved",
};

export default function BedPill({ bed, onClick }) {
  const style = STATUS_STYLES[bed.status] || STATUS_STYLES.blocked;

  return (
    <button
      onClick={() => onClick?.(bed)}
      title={STATUS_LABELS[bed.status] || bed.status}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 rounded-md border px-2 py-2.5 text-xs font-medium transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        style
      )}
    >
      <span className="font-display font-semibold">{bed.label}</span>
      <span className="text-[10px] font-normal opacity-80">{STATUS_LABELS[bed.status] || bed.status}</span>
    </button>
  );
}

export { STATUS_LABELS, STATUS_STYLES };
