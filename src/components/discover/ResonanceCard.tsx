import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, ChevronDown } from "lucide-react";

import type { DailyCandidate } from "@/lib/daily.functions";
import { haptic } from "@/lib/telegram";

export function ResonanceCard({
  candidate,
  photoUrl,
}: {
  candidate: DailyCandidate;
  photoUrl?: string;
}) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="relative aspect-[4/5] w-full bg-secondary">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={candidate.display_name ?? ""}
            className="h-full w-full object-cover transition-[filter] duration-300"
            style={{ filter: revealed ? "none" : "blur(22px)" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">🌿</div>
        )}

        {/* Resonance score badge */}
        <div className="absolute right-3 top-3 rounded-full bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground shadow">
          {candidate.score}
          {t("resonance.match")} · {t("resonance.scoreLabel")}
        </div>

        {photoUrl && (
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setRevealed((r) => !r);
            }}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white"
          >
            {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {revealed ? t("resonance.hidePhoto") : t("resonance.revealPhoto")}
          </button>
        )}

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 p-4 pt-12"
          style={{ background: "var(--gradient-photo)" }}
        >
          <h2 className="text-xl font-bold text-white">
            {candidate.display_name}
            {candidate.age != null && <span className="font-normal">, {candidate.age}</span>}
          </h2>
          {candidate.city && <p className="text-sm text-white/80">{candidate.city}</p>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-4">
        {candidate.signals.length === 0 && (
          <span className="text-sm text-muted-foreground">{t("resonance.scoreLabel")}: {candidate.score}%</span>
        )}
        {candidate.signals.map((s) => (
          <span
            key={s.id}
            className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground"
          >
            <span>{s.emoji}</span>
            {t(`resonance.signals.${s.key}`, s.values)}
          </span>
        ))}
      </div>

      {candidate.breakdown?.length > 0 && (
        <div className="border-t border-border px-4 pb-4">
          <button
            type="button"
            onClick={() => {
              haptic("selection");
              setShowBreakdown((v) => !v);
            }}
            className="flex w-full items-center justify-between py-3 text-sm font-semibold text-foreground"
          >
            {t("resonance.breakdown")}
            <ChevronDown
              className="h-4 w-4 text-muted-foreground transition-transform"
              style={{ transform: showBreakdown ? "rotate(180deg)" : "none" }}
            />
          </button>
          {showBreakdown && (
            <div className="space-y-2.5 pb-1">
              {candidate.breakdown.map((axis) => (
                <div key={axis.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs font-medium text-foreground">
                    {axis.emoji} {t(`resonance.axes.${axis.key}`)}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-500"
                      style={{ width: `${axis.score}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-muted-foreground">
                    {axis.score}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}