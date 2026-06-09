import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";

/** A labelled field wrapper. */
export function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        {optional && (
          <span className="text-xs text-muted-foreground">{t("common.optional")}</span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** A grid of single- or multi-select option chips driven by i18n labels. */
export function OptionGrid({
  group,
  values,
  selected,
  onSelect,
  multi = false,
  columns = 3,
}: {
  group: string;
  values: readonly string[];
  selected: string | string[] | null | undefined;
  onSelect: (value: string) => void;
  multi?: boolean;
  columns?: 2 | 3 | 4;
}) {
  const { t } = useTranslation();
  const isActive = (v: string) =>
    multi ? Array.isArray(selected) && selected.includes(v) : selected === v;
  const gridCols =
    columns === 2 ? "grid-cols-2" : columns === 4 ? "grid-cols-4" : "grid-cols-3";
  return (
    <div className={cn("grid gap-2", gridCols)}>
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => {
            haptic("selection");
            onSelect(v);
          }}
          className={cn(
            "rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
            isActive(v)
              ? "border-primary bg-primary text-primary-foreground shadow-sm"
              : "border-border bg-card text-foreground active:bg-accent",
          )}
        >
          {t(`options.${group}.${v}`)}
        </button>
      ))}
    </div>
  );
}