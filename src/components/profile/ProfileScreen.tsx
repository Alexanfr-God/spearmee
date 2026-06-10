import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";
import { useNav } from "@/components/nav";
import { PointsPill } from "@/components/points/PointsPill";
import { VerifiedBadge } from "@/components/points/VerifiedBadge";
import { VerifyDialog } from "@/components/points/VerifyDialog";
import { profileCompletePercent } from "@/lib/profile-complete";
import { logPremiumIntent } from "@/lib/helpers";
import { ageFromBirthDate } from "@/lib/calc";
import { setLanguage, SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

function Row({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("selection");
        onClick();
      }}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm font-medium text-foreground active:bg-accent"
    >
      <span>{label}</span>
      <span className="text-muted-foreground">›</span>
    </button>
  );
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, telegramPhotoUrl, refreshProfile } = useAuth();
  const { state } = usePoints();
  const nav = useNav();
  const [showVerify, setShowVerify] = useState(false);

  if (!profile) return null;

  const percent = profileCompletePercent(profile);
  const age = profile.birth_date ? ageFromBirthDate(profile.birth_date) : null;

  async function changeLanguage(lang: SupportedLang) {
    setLanguage(lang);
    await supabase.from("profiles").update({ language_code: lang }).eq("id", profile!.id);
    await refreshProfile();
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      <header className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-secondary">
          {telegramPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={telegramPhotoUrl}
              alt={profile.display_name ?? ""}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
              {(profile.display_name ?? "?").slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-foreground">
            {profile.display_name ?? t("profile.title")}
            {age != null && <span className="text-muted-foreground">, {age}</span>}
            {profile.verified && <VerifiedBadge className="ml-1 inline align-text-bottom" />}
          </h1>
          {profile.city && (
            <p className="truncate text-sm text-muted-foreground">{profile.city}</p>
          )}
        </div>
      </header>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t(`points.levels.${state.level}`)}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("points.total", { points: state.total })}
              {state.streak > 1 && ` · ${t("points.streak", { count: state.streak })}`}
            </p>
          </div>
          <PointsPill />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">
          {t("profile.complete", { percent })}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {!profile.verified && (
        <button
          type="button"
          onClick={() => {
            haptic("selection");
            setShowVerify(true);
          }}
          className="flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/5 px-4 py-3.5 text-left active:opacity-90"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("verify.cardTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("verify.cardSub")}</p>
          </div>
        </button>
      )}

      <div className="flex flex-col gap-2">
        <Row label={t("profile.editProfile")} onClick={nav.openEditProfile} />
        <Row label={t("profile.preferences")} onClick={nav.openPreferences} />
      </div>

      <div className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("profile.language")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_LANGS.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => changeLanguage(lang)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                profile.language_code === lang
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground active:bg-accent",
              )}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          haptic("medium");
          logPremiumIntent(profile.id, "premium_cta", { from: "profile" });
        }}
        className="rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground active:opacity-90"
      >
        {t("profile.premium")}
      </button>

      {showVerify && <VerifyDialog onClose={() => setShowVerify(false)} />}
    </div>
  );
}