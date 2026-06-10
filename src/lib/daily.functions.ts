import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ageFromBirthDate } from "@/lib/calc";
import {
  computeResonance,
  isDealbroken,
  type ScoreProfile,
  type ScorePrefs,
  type Signal,
  type AxisScore,
} from "@/lib/resonance";

const SCORE_FIELDS =
  "id, display_name, birth_date, gender, height_cm, city, country, lat, lng, wants_children, children_timeline, relationship_goal, smoking, drinking, religion, diet, eye_color, hair_color, ethnicity, wants_marriage, willing_to_relocate, verified";

const DAILY_LIMIT = 7;

export interface DailyCandidate {
  id: string;
  display_name: string | null;
  age: number | null;
  city: string | null;
  score: number;
  signals: Signal[];
  breakdown: AxisScore[];
  photo_path: string | null;
  verified: boolean;
}

export interface DailySetResult {
  total: number;
  remaining: number;
  candidates: DailyCandidate[];
}

/**
 * Builds (once per day) and returns the viewer's curated Resonance set:
 * the top-scoring candidates, dealbreaker-filtered, sorted by compatibility.
 */
export const getDailySet = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DailySetResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: viewer } = await supabaseAdmin
      .from("profiles")
      .select(SCORE_FIELDS)
      .eq("id", userId)
      .maybeSingle();
    if (!viewer) return { total: 0, remaining: 0, candidates: [] };

    const { data: prefsRow } = await supabaseAdmin
      .from("preferences")
      .select("*")
      .eq("profile_id", userId)
      .maybeSingle();
    const prefs = (prefsRow ?? null) as ScorePrefs | null;

    const today = new Date().toISOString().slice(0, 10);

    // People the viewer already acted on.
    const { data: swipes } = await supabaseAdmin
      .from("swipes")
      .select("target_id")
      .eq("swiper_id", userId);
    const swiped = new Set((swipes ?? []).map((s) => s.target_id));

    let { data: set } = await supabaseAdmin
      .from("daily_sets")
      .select("*")
      .eq("profile_id", userId)
      .eq("set_date", today)
      .maybeSingle();

    if (!set) {
      const { data: pool } = await supabaseAdmin
        .from("profiles")
        .select(SCORE_FIELDS)
        .eq("onboarded", true)
        .neq("id", userId)
        .limit(300);

      const scored = (pool ?? [])
        .filter((p) => !swiped.has(p.id))
        .filter((p) => !isDealbroken(prefs, p as ScoreProfile))
        .map((p) => ({ p, r: computeResonance(viewer as ScoreProfile, prefs, p as ScoreProfile) }))
        .sort(
          (a, b) =>
            b.r.score +
            ((b.p as { verified?: boolean }).verified ? 2 : 0) -
            (a.r.score + ((a.p as { verified?: boolean }).verified ? 2 : 0)),
        )
        .slice(0, DAILY_LIMIT);

      const candidate_ids = scored.map((s) => s.p.id);
      const ins = await supabaseAdmin
        .from("daily_sets")
        .insert({ profile_id: userId, set_date: today, candidate_ids, seen_ids: [] })
        .select("*")
        .maybeSingle();
      set = ins.data;
    }

    const candidateIds: string[] = set?.candidate_ids ?? [];
    const remainingIds = candidateIds.filter((id) => !swiped.has(id));

    if (remainingIds.length === 0) {
      return { total: candidateIds.length, remaining: 0, candidates: [] };
    }

    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select(SCORE_FIELDS)
      .in("id", remainingIds);
    const { data: photos } = await supabaseAdmin
      .from("photos")
      .select("profile_id, storage_path, position")
      .in("profile_id", remainingIds)
      .order("position", { ascending: true });

    const byId = new Map((profs ?? []).map((p) => [p.id, p]));
    const candidates: DailyCandidate[] = [];
    for (const id of remainingIds) {
      const p = byId.get(id);
      if (!p) continue;
      const r = computeResonance(viewer as ScoreProfile, prefs, p as ScoreProfile);
      const photo = (photos ?? []).find((ph) => ph.profile_id === id)?.storage_path ?? null;
      candidates.push({
        id,
        display_name: p.display_name,
        age: ageFromBirthDate(p.birth_date),
        city: p.city,
        score: r.score,
        signals: r.signals,
        breakdown: r.breakdown,
        photo_path: photo,
        verified: (p as { verified?: boolean }).verified ?? false,
      });
    }

    return { total: candidateIds.length, remaining: candidates.length, candidates };
  });