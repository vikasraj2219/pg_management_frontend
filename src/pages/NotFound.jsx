import { Link } from "react-router-dom";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="font-display text-4xl font-semibold">404</h1>
      <p className="text-sm text-muted-foreground">This page doesn't exist.</p>
      <Link to="/dashboard" className={cn(buttonVariants({ variant: "default" }))}>
        Back to dashboard
      </Link>
    </div>
  );
}
