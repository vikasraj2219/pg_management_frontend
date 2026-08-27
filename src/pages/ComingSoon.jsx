import { Construction } from "lucide-react";

export default function ComingSoon({ title }) {
  return (
    <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <Construction className="h-10 w-10 text-muted-foreground" />
      <h1 className="font-display text-xl font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This module is on the build roadmap and will land in a later development phase.
      </p>
    </div>
  );
}
