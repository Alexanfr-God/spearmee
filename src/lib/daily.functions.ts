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
import { PERK_COSTS, EXTRA_PICKS_AMOUNT } from "@/lib/perks";

const SCORE_FIELDS =
  "id, display_name, birth_date, gender, height_cm, city, country, lat, lng, wants_children, children_timeline, relationship_goal, smoking, drinking, religion, diet, eye_color, hair_color, ethnicity, wants_marriage, willing_to_relocate, verified, boost_until";

const DAILY_LIMIT = 7;

/** Extra ranking weight for profiles with an active boost. */
function boostBonus(p: unknown): number {
  const b = (p as { boost_until?: string | null }).boost_until;
  return b && new Date(b).getTime() > Date.now() ? 3 : 0;
}

export interface DailyCandidate {
  id: string;
  display_name: string | null;
  age: number | null;
  city: string | null;
  score: number;
  signals: Signal[];
  breakdown: AxisScore[];
  photo_url: string | null;
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
        .sort((a, b) => {
          const rank = (x: { p: unknown; r: { score: number } }) =>
            x.r.score + ((x.p as { verified?: boolean }).verified ? 2 : 0) + boostBonus(x.p);
          return rank(b) - rank(a);
        })
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

    // Sign candidate photos server-side (service role) so the private `photos`
    // bucket never needs a broad client-readable SELECT policy. Candidates are
    // not yet match members, so they could not sign these URLs from the client.
    const photoPaths = [
      ...new Set((photos ?? []).map((ph) => ph.storage_path).filter(Boolean)),
    ] as string[];
    const signedMap = new Map<string, string>();
    if (photoPaths.length > 0) {
      const { data: signed } = await supabaseAdmin.storage
        .from("photos")
        .createSignedUrls(photoPaths, 60 * 60);
      for (const item of signed ?? []) {
        if (item.signedUrl && item.path) signedMap.set(item.path, item.signedUrl);
      }
    }

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
        photo_url: photo ? (signedMap.get(photo) ?? null) : null,
        verified: (p as { verified?: boolean }).verified ?? false,
      });
    }

    return { total: candidateIds.length, remaining: candidates.length, candidates };
  });

/** Spend RP for a fresh batch of top-scoring candidates appended to today's set. */
export const getMorePicks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(
    async ({
      context,
    }): Promise<{
      ok: boolean;
      reason?: "not_enough" | "no_more";
      added: number;
      balance: number;
    }> => {
      const { userId } = context;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      const { data: ledger } = await supabaseAdmin
        .from("points_ledger")
        .select("points")
        .eq("profile_id", userId);
      const balance = (ledger ?? []).reduce((acc, r) => acc + (r.points ?? 0), 0);
      if (balance < PERK_COSTS.extra_picks) {
        return { ok: false, reason: "not_enough", added: 0, balance };
      }

      const { data: viewer } = await supabaseAdmin
        .from("profiles")
        .select(SCORE_FIELDS)
        .eq("id", userId)
        .maybeSingle();
      if (!viewer) return { ok: false, added: 0, balance };

      const { data: prefsRow } = await supabaseAdmin
        .from("preferences")
        .select("*")
        .eq("profile_id", userId)
        .maybeSingle();
      const prefs = (prefsRow ?? null) as ScorePrefs | null;

      const today = new Date().toISOString().slice(0, 10);
      const { data: set } = await supabaseAdmin
        .from("daily_sets")
        .select("*")
        .eq("profile_id", userId)
        .eq("set_date", today)
        .maybeSingle();
      const existing = new Set<string>(set?.candidate_ids ?? []);

      const { data: swipes } = await supabaseAdmin
        .from("swipes")
        .select("target_id")
        .eq("swiper_id", userId);
      const swiped = new Set((swipes ?? []).map((s) => s.target_id));

      const { data: pool } = await supabaseAdmin
        .from("profiles")
        .select(SCORE_FIELDS)
        .eq("onboarded", true)
        .neq("id", userId)
        .limit(400);

      const fresh = (pool ?? [])
        .filter((p) => !swiped.has(p.id) && !existing.has(p.id))
        .filter((p) => !isDealbroken(prefs, p as ScoreProfile))
        .map((p) => ({ p, r: computeResonance(viewer as ScoreProfile, prefs, p as ScoreProfile) }))
        .sort((a, b) => b.r.score + boostBonus(b.p) - (a.r.score + boostBonus(a.p)))
        .slice(0, EXTRA_PICKS_AMOUNT)
        .map((s) => s.p.id);

      if (fresh.length === 0) {
        return { ok: false, reason: "no_more", added: 0, balance };
      }

      await supabaseAdmin.from("points_ledger").insert({
        profile_id: userId,
        action: "perk:extra_picks",
        points: -PERK_COSTS.extra_picks,
        dedupe_key: null,
      });

      const newIds = [...(set?.candidate_ids ?? []), ...fresh];
      if (set) {
        await supabaseAdmin
          .from("daily_sets")
          .update({ candidate_ids: newIds })
          .eq("profile_id", userId)
          .eq("set_date", today);
      } else {
        await supabaseAdmin
          .from("daily_sets")
          .insert({ profile_id: userId, set_date: today, candidate_ids: newIds, seen_ids: [] });
      }

      return { ok: true, added: fresh.length, balance: balance - PERK_COSTS.extra_picks };
    },
  );
