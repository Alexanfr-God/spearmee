import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/utils";

export function VerifiedBadge({
  className,
  size = 16,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <BadgeCheck
      className={cn("text-primary", className)}
      style={{ width: size, height: size }}
      aria-label="Verified"
    />
  );
}
