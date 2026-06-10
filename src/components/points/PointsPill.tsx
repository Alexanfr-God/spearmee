import { useTranslation } from "react-i18next";

import { usePoints } from "@/hooks/usePoints";
import { cn } from "@/lib/utils";

const LEVEL_COLOR: Record<number, string> = {
  0: "bg-secondary text-secondary-foreground",
  1: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  2: "bg-slate-400/15 text-slate-600 dark:text-slate-300",
  3: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  4: "bg-primary/15 text-primary",
};

export function PointsPill({ className }: { className?: string }) {
  const { state } = usePoints();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
          LEVEL_COLOR[state.level] ?? LEVEL_COLOR[0],
        )}
      >
        <span aria-hidden>✦</span>
        {state.total}
      </span>
      {state.streak > 1 && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/15 px-2 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
          <span aria-hidden>🔥</span>
          {state.streak}
        </span>
      )}
    </div>
  );
}

export function levelName(t: (k: string) => string, level: number): string {
  return t(`points.levels.${level}`);
}
