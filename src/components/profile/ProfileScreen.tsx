import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Link2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { usePoints } from "@/hooks/usePoints";
import { useNav } from "@/components/nav";
import { PointsPill } from "@/components/points/PointsPill";
import { VerifiedBadge } from "@/components/points/VerifiedBadge";
import { VerifyDialog } from "@/components/points/VerifyDialog";
import { profileCompletePercent } from "@/lib/profile-complete";
import { logPremiumIntent } from "@/lib/helpers";
import { devResetAndSeed } from "@/lib/dev.functions";
import { ageFromBirthDate } from "@/lib/calc";
import { setLanguage, SUPPORTED_LANGS, LANG_LABELS, type SupportedLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function Row({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        haptic("selection");
        onClick();
      }}
      className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3.5 text-left text-sm font-medium text-foreground active:bg-accent"
    >
      <span>{label}</span>
      <span className="text-muted-foreground">›</span>
    </motion.button>
  );
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const { profile, telegramPhotoUrl, refreshProfile } = useAuth();
  const { state, award } = usePoints();
  const nav = useNav();
  const [showVerify, setShowVerify] = useState(false);
  const socials = (profile ?? {}) as { social_x?: string | null; social_instagram?: string | null };
  const [socialX, setSocialX] = useState(socials.social_x ?? "");
  const [socialIg, setSocialIg] = useState(socials.social_instagram ?? "");
  const [savingSocial, setSavingSocial] = useState(false);
  const callDevSeed = useServerFn(devResetAndSeed);
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);

  if (!profile) return null;

  const percent = profileCompletePercent(profile);
  const age = profile.birth_date ? ageFromBirthDate(profile.birth_date) : null;

  async function changeLanguage(lang: SupportedLang) {
    setLanguage(lang);
    await supabase.from("profiles").update({ language_code: lang }).eq("id", profile!.id);
    await refreshProfile();
  }

  async function saveSocials() {
    setSavingSocial(true);
    haptic("selection");
    const hadNone = !socials.social_x && !socials.social_instagram;
    const x = socialX.trim() || null;
    const ig = socialIg.trim() || null;
    await supabase
      .from("profiles")
      .update({ social_x: x, social_instagram: ig } as never)
      .eq("id", profile!.id);
    if (hadNone && (x || ig)) void award("social_linked");
    await refreshProfile();
    toast.success(t("common.saved"));
    setSavingSocial(false);
  }

  // DEV ONLY — reseed my discovery/matches so the demo is testable.
  async function devReset() {
    setSeeding(true);
    haptic("medium");
    try {
      const r = await callDevSeed();
      toast.success(
        `Seeded — female: ${r.femaleTotal}, with photos: ${r.femaleWithPhotos}, matches: ${r.matchesCreated}`,
      );
      await queryClient.invalidateQueries({ queryKey: ["dailySet"] });
      nav.setTab("discover");
    } catch {
      toast.error("Dev seed failed");
    } finally {
      setSeeding(false);
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      className="flex flex-col gap-5 px-4 py-5"
    >
      <motion.header variants={item} className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-secondary ring-2 ring-primary/15">
          {telegramPhotoUrl ? (
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
          {profile.city && <p className="truncate text-sm text-muted-foreground">{profile.city}</p>}
        </div>
      </motion.header>

      <motion.div
        variants={item}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-4"
      >
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
      </motion.div>

      <motion.div variants={item} className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground">{t("profile.complete", { percent })}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>

      {!profile.verified && (
        <motion.button
          variants={item}
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            haptic("selection");
            setShowVerify(true);
          }}
          className="flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left"
          style={{
            borderColor: "color-mix(in oklab, var(--gold) 45%, transparent)",
            background: "color-mix(in oklab, var(--gold) 10%, transparent)",
          }}
        >
          <ShieldCheck className="h-5 w-5 shrink-0" style={{ color: "var(--gold)" }} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{t("verify.cardTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("verify.cardSub")}</p>
          </div>
        </motion.button>
      )}

      <motion.div variants={item} className="flex flex-col gap-2">
        <Row label={t("profile.editProfile")} onClick={nav.openEditProfile} />
        <Row label={t("profile.preferences")} onClick={nav.openPreferences} />
      </motion.div>

      <motion.div variants={item} className="space-y-2">
        <p className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("profile.language")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {SUPPORTED_LANGS.map((lang) => (
            <motion.button
              key={lang}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => changeLanguage(lang)}
              className={cn(
                "rounded-xl border px-2 py-2.5 text-sm font-medium transition-colors",
                profile.language_code === lang
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground active:bg-accent",
              )}
            >
              {LANG_LABELS[lang]}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        variants={item}
        className="space-y-2 rounded-2xl border border-border bg-card p-4"
      >
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">{t("socials.title")}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t("socials.hint")}</p>
        <div className="space-y-2 pt-1">
          <Input
            value={socialX}
            placeholder="X / Twitter @handle"
            onChange={(e) => setSocialX(e.target.value)}
          />
          <Input
            value={socialIg}
            placeholder="Instagram @handle"
            onChange={(e) => setSocialIg(e.target.value)}
          />
        </div>
        <Button size="sm" className="mt-1 w-full" onClick={saveSocials} disabled={savingSocial}>
          {savingSocial ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
        </Button>
      </motion.div>

      <motion.button
        variants={item}
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={() => {
          haptic("medium");
          logPremiumIntent(profile.id, "premium_cta", { from: "profile" });
        }}
        className="rounded-2xl px-4 py-3.5 text-sm font-semibold text-primary-foreground"
        style={{
          background:
            "linear-gradient(135deg, var(--primary), color-mix(in oklab, var(--primary) 70%, var(--coral)))",
        }}
      >
        {t("profile.premium")}
      </motion.button>

      {/* DEV ONLY — reseed discovery/matches for testing. TODO: gate or remove before launch. */}
      <motion.button
        variants={item}
        type="button"
        whileTap={{ scale: 0.98 }}
        onClick={devReset}
        disabled={seeding}
        className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground active:bg-accent"
      >
        {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : "🔧 DEV: Reset & seed demo"}
      </motion.button>

      {showVerify && <VerifyDialog onClose={() => setShowVerify(false)} />}
    </motion.div>
  );
}
