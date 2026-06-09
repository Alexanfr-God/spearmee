import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { OptionGrid, Field } from "@/components/ui/Field";
import { haptic } from "@/lib/telegram";
import {
  WANTS_CHILDREN,
  CHILDREN_TIMELINE,
  RELATIONSHIP_GOAL,
  SMOKING,
  DRINKING,
  RELIGION,
  EDUCATION,
  EYE_COLORS,
  HAIR_COLORS,
  ETHNICITIES,
  WILLING_TO_RELOCATE,
} from "@/lib/options";
import type { Database } from "@/integrations/supabase/types";

type Prefs = Database["public"]["Tables"]["preferences"]["Row"];
type PrefsDraft = Partial<Prefs>;

const MULTI_GROUPS: {
  key: keyof Prefs;
  labelKey: string;
  group: string;
  values: readonly string[];
  columns?: 2 | 3 | 4;
}[] = [
  { key: "wants_children", labelKey: "preferences.wantsChildren", group: "wants_children", values: WANTS_CHILDREN, columns: 4 },
  { key: "children_timeline", labelKey: "preferences.childrenTimeline", group: "children_timeline", values: CHILDREN_TIMELINE, columns: 2 },
  { key: "relationship_goal", labelKey: "preferences.relationshipGoal", group: "relationship_goal", values: RELATIONSHIP_GOAL, columns: 2 },
  { key: "smoking", labelKey: "preferences.smoking", group: "smoking", values: SMOKING, columns: 3 },
  { key: "drinking", labelKey: "preferences.drinking", group: "drinking", values: DRINKING, columns: 3 },
  { key: "religion", labelKey: "preferences.religion", group: "religion", values: RELIGION, columns: 3 },
  { key: "education", labelKey: "preferences.education", group: "education", values: EDUCATION, columns: 3 },
  { key: "eye_color", labelKey: "preferences.eyeColor", group: "eye_color", values: EYE_COLORS, columns: 3 },
  { key: "hair_color", labelKey: "preferences.hairColor", group: "hair_color", values: HAIR_COLORS, columns: 3 },
  { key: "ethnicity", labelKey: "preferences.ethnicity", group: "ethnicity", values: ETHNICITIES, columns: 3 },
];

export function PreferencesScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [draft, setDraft] = useState<PrefsDraft>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("preferences")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle();
      setDraft(data ?? {});
      setLoading(false);
    })();
  }, [profile]);

  function toggle(key: keyof Prefs, value: string) {
    setDraft((d) => {
      const cur = (d[key] as string[] | null | undefined) ?? [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...d, [key]: next };
    });
  }

  function setNum(key: keyof Prefs, value: number) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    if (!profile) return;
    haptic("medium");
    setSaving(true);
    const payload = { ...draft, profile_id: profile.id };
    const { error } = await supabase
      .from("preferences")
      .upsert(payload as never, { onConflict: "profile_id" });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    haptic("success");
    toast.success(t("preferences.saved"));
    onBack();
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary">
          <ChevronLeft className="h-4 w-4" /> {t("common.back")}
        </button>
        <h1 className="ml-1 text-base font-bold text-foreground">{t("preferences.title")}</h1>
      </header>

      <div className="flex-1 space-y-6 px-4 py-5 pb-28">
        <p className="text-sm text-muted-foreground">{t("preferences.subtitle")}</p>

        <Field label={t("preferences.ageRange")}>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={draft.age_min ?? ""}
              onChange={(e) => setNum("age_min", Number(e.target.value))}
              placeholder="18"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              value={draft.age_max ?? ""}
              onChange={(e) => setNum("age_max", Number(e.target.value))}
              placeholder="60"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
            />
          </div>
        </Field>

        <Field label={t("preferences.heightRange")} optional>
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={draft.height_min ?? ""}
              onChange={(e) => setNum("height_min", Number(e.target.value))}
              placeholder="150"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
            />
            <span className="text-muted-foreground">–</span>
            <input
              type="number"
              value={draft.height_max ?? ""}
              onChange={(e) => setNum("height_max", Number(e.target.value))}
              placeholder="200"
              className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground"
            />
          </div>
        </Field>

        <Field
          label={t("preferences.distance")}
          hint={draft.distance_km ? t("preferences.distanceValue", { km: draft.distance_km }) : undefined}
          optional
        >
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={draft.distance_km ?? 100}
            onChange={(e) => setNum("distance_km", Number(e.target.value))}
            className="w-full accent-primary"
          />
        </Field>

        {MULTI_GROUPS.map((g) => (
          <Field key={String(g.key)} label={t(g.labelKey)} hint={t("preferences.softHint")} optional>
            <OptionGrid
              group={g.group}
              values={g.values}
              selected={(draft[g.key] as string[] | null | undefined) ?? []}
              onSelect={(v) => toggle(g.key, v)}
              multi
              columns={g.columns}
            />
          </Field>
        ))}

        <Field label={t("preferences.willingToRelocate")} optional>
          <OptionGrid
            group="willing_to_relocate"
            values={WILLING_TO_RELOCATE}
            selected={draft.willing_to_relocate ?? null}
            onSelect={(v) =>
              setDraft((d) => ({
                ...d,
                willing_to_relocate: d.willing_to_relocate === v ? null : v,
              }))
            }
            columns={3}
          />
        </Field>
      </div>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[420px] border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground active:opacity-90 disabled:opacity-60"
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </div>
  );
}