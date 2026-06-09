import { useTranslation } from "react-i18next";

import type { DailyCandidate } from "@/lib/daily.functions";
import { Button } from "@/components/ui/button";

export function MatchModal({
  candidate,
  photoUrl,
  onClose,
  onSayHello,
}: {
  candidate: DailyCandidate;
  photoUrl?: string;
  onClose: () => void;
  onSayHello: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6">
      <div className="w-full max-w-[340px] rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)]">
        <div className="text-4xl">💜</div>
        <h2 className="mt-3 text-2xl font-bold text-foreground">{t("resonance.matchTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("resonance.matchBody", { name: candidate.display_name })}
        </p>
        {photoUrl && (
          <img
            src={photoUrl}
            alt={candidate.display_name ?? ""}
            className="mx-auto mt-4 h-28 w-28 rounded-full object-cover"
          />
        )}
        <div className="mt-6 space-y-2">
          <Button className="w-full" size="lg" onClick={onSayHello}>
            {t("resonance.sayHello")}
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>
            {t("resonance.keepGoing")}
          </Button>
        </div>
      </div>
    </div>
  );
}