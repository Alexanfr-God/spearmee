import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Field, OptionGrid } from "@/components/ui/Field";
import { PhotosStep } from "@/components/onboarding/PhotosStep";

import { supabase } from "@/integrations/supabase/client";
import { useAuth, type Profile } from "@/hooks/useAuth";
import { haptic } from "@/lib/telegram";
import { ageFromBirthDate } from "@/lib/calc";
import { setLanguage, SUPPORTED_LANGS, LANG_LABELS } from "@/lib/i18n";
import {
  GENDERS,
  EYE_COLORS,
  HAIR_COLORS,
  HAIR_TYPES,
  BODY_TYPES,
  ETHNICITIES,
  WANTS_CHILDREN,
  CHILDREN_TIMELINE,
  HAS_CHILDREN,
  RELATIONSHIP_GOAL,
  SMOKING,
  DRINKING,
  RELIGION,
  DIET,
  EXERCISE,
  WANTS_MARRIAGE,
  WILLING_TO_RELOCATE,
} from "@/lib/options";

type Form = Partial<Profile>;

export function RegistrationWizard({
  mode,
  onDone,
}: {
  mode: "onboarding" | "edit";
  onDone?: () => void;
}) {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Form>(profile ?? {});

  useEffect(() => {
    if (profile) setForm((f) => ({ ...profile, ...f }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userId = profile?.id ?? "";
  const set = (patch: Form) => setForm((f) => ({ ...f, ...patch }));
  const toggleLang = (code: string) => {
    const cur = form.native_languages ?? [];
    set({
      native_languages: cur.includes(code)
        ? cur.filter((c) => c !== code)
        : [...cur, code],
    });
  };

  const steps = useMemo(
    () => [
      { key: "photos", title: t("onboarding.photos.title") },
      { key: "basics", title: t("onboarding.basics.title") },
      { key: "appearance", title: t("onboarding.appearance.title") },
      { key: "intent", title: t("onboarding.intent.title") },
      { key: "lifestyle", title: t("onboarding.lifestyle.title") },
      { key: "location", title: t("onboarding.location.title") },
      { key: "bio", title: t("onboarding.bio.title") },
    ],
    [t],
  );

  const total = steps.length;
  const isLast = step === total - 1;

  const persist = async (extra: Form) => {
    if (!userId) return;
    const payload = { ...form, ...extra };
    const { id, created_at, telegram_id, ...updatable } = payload;
    await supabase.from("profiles").update(updatable).eq("id", userId);
    await refreshProfile();
  };

  const next = async () => {
    haptic("light");
    if (isLast) {
      setSaving(true);
      try {
        await persist({ onboarded: true });
        haptic("success");
        onDone?.();
      } finally {
        setSaving(false);
      }
      return;
    }
    // Save progress incrementally so users can resume.
    await persist({});
    setStep((s) => Math.min(total - 1, s + 1));
  };

  const back = () => {
    haptic("light");
    if (step === 0) {
      if (mode === "edit") onDone?.();
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const age = ageFromBirthDate(form.birth_date);

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col">
      <header className="sticky top-0 z-10 space-y-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-3">
          {(step > 0 || mode === "edit") && (
            <button onClick={back} className="-ml-1 rounded-full p-1 text-foreground">
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {t("onboarding.step", { current: step + 1, total })}
            </p>
            <h1 className="text-lg font-bold text-foreground">{steps[step].title}</h1>
          </div>
          {mode === "edit" && (
            <button onClick={() => onDone?.()} className="text-sm font-medium text-primary">
              {t("common.done")}
            </button>
          )}
        </div>
        <Progress value={((step + 1) / total) * 100} />
      </header>

      <main className="flex-1 space-y-5 px-4 py-4">
        {steps[step].key === "photos" && <PhotosStep userId={userId} />}

        {steps[step].key === "basics" && (
          <>
            <Field label={t("onboarding.basics.name")}>
              <Input
                value={form.display_name ?? ""}
                placeholder={t("onboarding.basics.namePlaceholder")}
                onChange={(e) => set({ display_name: e.target.value })}
              />
            </Field>
            <Field label={t("onboarding.basics.birth")} hint={age ? t("common.years", { count: age }) : undefined}>
              <Input
                type="date"
                value={form.birth_date ?? ""}
                onChange={(e) => set({ birth_date: e.target.value })}
              />
            </Field>
            <Field label={t("onboarding.basics.gender")}>
              <OptionGrid group="gender" values={GENDERS} selected={form.gender} onSelect={(v) => set({ gender: v })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("onboarding.basics.height")}>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.height_cm ?? ""}
                  onChange={(e) => set({ height_cm: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
              <Field label={t("onboarding.basics.weight")} optional>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={form.weight_kg ?? ""}
                  onChange={(e) => set({ weight_kg: e.target.value ? Number(e.target.value) : null })}
                />
              </Field>
            </div>
          </>
        )}

        {steps[step].key === "appearance" && (
          <>
            <p className="text-xs text-muted-foreground">{t("onboarding.appearance.note")}</p>
            <Field label={t("onboarding.appearance.eyeColor")}>
              <OptionGrid group="eye_color" values={EYE_COLORS} selected={form.eye_color} onSelect={(v) => set({ eye_color: v })} />
            </Field>
            <Field label={t("onboarding.appearance.hairColor")}>
              <OptionGrid group="hair_color" values={HAIR_COLORS} selected={form.hair_color} onSelect={(v) => set({ hair_color: v })} />
            </Field>
            <Field label={t("onboarding.appearance.hairType")}>
              <OptionGrid group="hair_type" values={HAIR_TYPES} columns={4} selected={form.hair_type} onSelect={(v) => set({ hair_type: v })} />
            </Field>
            <Field label={t("onboarding.appearance.bodyType")}>
              <OptionGrid group="body_type" values={BODY_TYPES} selected={form.body_type} onSelect={(v) => set({ body_type: v })} />
            </Field>
            <Field label={t("onboarding.appearance.ethnicity")} optional>
              <OptionGrid group="ethnicity" values={ETHNICITIES} columns={2} selected={form.ethnicity} onSelect={(v) => set({ ethnicity: v })} />
            </Field>
          </>
        )}

        {steps[step].key === "intent" && (
          <>
            <Field label={t("onboarding.intent.wantsChildren")}>
              <OptionGrid group="wants_children" values={WANTS_CHILDREN} columns={4} selected={form.wants_children} onSelect={(v) => set({ wants_children: v })} />
            </Field>
            <Field label={t("onboarding.intent.childrenTimeline")}>
              <OptionGrid group="children_timeline" values={CHILDREN_TIMELINE} columns={2} selected={form.children_timeline} onSelect={(v) => set({ children_timeline: v })} />
            </Field>
            <Field label={t("onboarding.intent.hasChildren")}>
              <OptionGrid group="has_children" values={HAS_CHILDREN} columns={2} selected={form.has_children} onSelect={(v) => set({ has_children: v })} />
            </Field>
            <Field label={t("onboarding.intent.relationshipGoal")}>
              <OptionGrid group="relationship_goal" values={RELATIONSHIP_GOAL} columns={2} selected={form.relationship_goal} onSelect={(v) => set({ relationship_goal: v })} />
            </Field>
          </>
        )}

        {steps[step].key === "lifestyle" && (
          <>
            <Field label={t("onboarding.lifestyle.smoking")}>
              <OptionGrid group="smoking" values={SMOKING} selected={form.smoking} onSelect={(v) => set({ smoking: v })} />
            </Field>
            <Field label={t("onboarding.lifestyle.drinking")}>
              <OptionGrid group="drinking" values={DRINKING} selected={form.drinking} onSelect={(v) => set({ drinking: v })} />
            </Field>
            <Field label={t("onboarding.lifestyle.religion")} optional>
              <OptionGrid group="religion" values={RELIGION} columns={2} selected={form.religion} onSelect={(v) => set({ religion: v })} />
            </Field>
            <Field label={t("onboarding.lifestyle.diet")} optional>
              <OptionGrid group="diet" values={DIET} columns={3} selected={form.diet} onSelect={(v) => set({ diet: v })} />
            </Field>
            <Field label={t("onboarding.lifestyle.exercise")} optional>
              <OptionGrid group="exercise" values={EXERCISE} columns={4} selected={form.exercise} onSelect={(v) => set({ exercise: v })} />
            </Field>
            <Field label={t("onboarding.lifestyle.wantsMarriage")}>
              <OptionGrid group="wants_marriage" values={WANTS_MARRIAGE} selected={form.wants_marriage} onSelect={(v) => set({ wants_marriage: v })} />
            </Field>
            <Field label={t("onboarding.lifestyle.willingToRelocate")}>
              <OptionGrid group="willing_to_relocate" values={WILLING_TO_RELOCATE} selected={form.willing_to_relocate} onSelect={(v) => set({ willing_to_relocate: v })} />
            </Field>
          </>
        )}

        {steps[step].key === "location" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("onboarding.location.city")}>
                <Input value={form.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
              </Field>
              <Field label={t("onboarding.location.country")}>
                <Input value={form.country ?? ""} onChange={(e) => set({ country: e.target.value })} />
              </Field>
            </div>
            <Field label={t("onboarding.location.nativeLanguages")}>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LANGS.map((code) => {
                  const active = (form.native_languages ?? []).includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => toggleLang(code)}
                      className={
                        "rounded-full border px-3 py-1.5 text-sm " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground")
                      }
                    >
                      {LANG_LABELS[code]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t("onboarding.location.uiLanguage")}>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_LANGS.map((code) => {
                  const active = form.language_code === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        set({ language_code: code });
                        setLanguage(code);
                      }}
                      className={
                        "rounded-full border px-3 py-1.5 text-sm " +
                        (active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground")
                      }
                    >
                      {LANG_LABELS[code]}
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        )}

        {steps[step].key === "bio" && (
          <>
            <Field label={t("onboarding.bio.bio")}>
              <Textarea
                rows={4}
                value={form.bio ?? ""}
                placeholder={t("onboarding.bio.bioPlaceholder")}
                onChange={(e) => set({ bio: e.target.value })}
              />
            </Field>
            <Field label={t("onboarding.bio.prompt")}>
              <Textarea
                rows={3}
                value={form.prompt_answer ?? ""}
                placeholder={t("onboarding.bio.promptPlaceholder")}
                onChange={(e) => set({ prompt_answer: e.target.value })}
              />
            </Field>
          </>
        )}
      </main>

      <footer className="sticky bottom-0 border-t border-border bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
        <Button className="w-full" size="lg" onClick={next} disabled={saving}>
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : isLast ? (
            t("onboarding.finish")
          ) : (
            t("onboarding.next")
          )}
        </Button>
      </footer>
    </div>
  );
}