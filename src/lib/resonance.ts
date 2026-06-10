// Compatibility ("Resonance") scoring — pure functions, usable on client & server.
// Computes a 0–100 score between a viewer and a candidate using the candidate's
// profile and the viewer's preferences, plus the matched signals to show as chips.
import { ageFromBirthDate, distanceKm } from "@/lib/calc";

export interface ScoreProfile {
  id: string;
  display_name: string | null;
  birth_date: string | null;
  gender: string | null;
  height_cm: number | null;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  wants_children: string | null;
  children_timeline: string | null;
  relationship_goal: string | null;
  smoking: string | null;
  drinking: string | null;
  religion: string | null;
  diet: string | null;
  eye_color: string | null;
  hair_color: string | null;
  ethnicity: string | null;
  wants_marriage: string | null;
  willing_to_relocate: string | null;
}

export interface ScorePrefs {
  age_min: number | null;
  age_max: number | null;
  distance_km: number | null;
  height_min: number | null;
  height_max: number | null;
  wants_children: string[] | null;
  children_timeline: string[] | null;
  relationship_goal: string[] | null;
  smoking: string[] | null;
  drinking: string[] | null;
  religion: string[] | null;
  education: string[] | null;
  eye_color: string[] | null;
  hair_color: string[] | null;
  ethnicity: string[] | null;
  willing_to_relocate: string | null;
  dealbreakers: string[] | null;
}

export interface Signal {
  id: string;
  emoji: string;
  /** i18n key under "resonance.signals" */
  key: string;
  values?: Record<string, string | number>;
}

export interface AxisScore {
  /** i18n key under "resonance.axes" */
  key: string;
  emoji: string;
  /** 0–100 sub-score for this compatibility axis */
  score: number;
}

export interface ResonanceResult {
  score: number;
  signals: Signal[];
  breakdown: AxisScore[];
}

const TIMELINE_ORDER = ["within_1y", "1_3y", "someday", "undecided"];
const SMOKE_ORDER = ["never", "sometimes", "regularly"];
const DRINK_ORDER = ["never", "sometimes", "often"];

function ordinalCloseness(order: string[], a?: string | null, b?: string | null): number {
  if (!a || !b) return 0.5;
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  if (ia < 0 || ib < 0) return a === b ? 1 : 0;
  const dist = Math.abs(ia - ib);
  return Math.max(0, 1 - dist / Math.max(1, order.length - 1));
}

function childrenAlignment(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0.5;
  if (a === b) return 1;
  const positive = new Set(["yes", "open"]);
  if (positive.has(a) && positive.has(b)) return 0.85;
  if (a === "no" && positive.has(b)) return 0;
  if (b === "no" && positive.has(a)) return 0;
  return 0.4;
}

/** True when the candidate should be excluded by the viewer's hard dealbreakers. */
export function isDealbroken(prefs: ScorePrefs | null, c: ScoreProfile): boolean {
  const db = prefs?.dealbreakers ?? [];
  if (db.length === 0) return false;
  for (const item of db) {
    if (item === "smoking" && c.smoking && c.smoking !== "never") return true;
    if (item === "no_children" && c.wants_children === "no") return true;
    if (item === "has_children" && c.relationship_goal === "casual") return true;
    if (item === "wants_children" && prefs?.wants_children?.length) {
      if (c.wants_children && !prefs.wants_children.includes(c.wants_children)) return true;
    }
    if (item === "relationship_goal" && prefs?.relationship_goal?.length) {
      if (c.relationship_goal && !prefs.relationship_goal.includes(c.relationship_goal)) return true;
    }
    if (item === "religion" && prefs?.religion?.length) {
      if (c.religion && !prefs.religion.includes(c.religion)) return true;
    }
  }
  return false;
}

export function computeResonance(
  viewer: ScoreProfile,
  prefs: ScorePrefs | null,
  candidate: ScoreProfile,
): ResonanceResult {
  let score = 0;
  const signals: Signal[] = [];

  // 25% — wants_children alignment
  const wc = childrenAlignment(viewer.wants_children, candidate.wants_children);
  score += wc * 25;
  if (wc >= 0.85 && candidate.wants_children && candidate.wants_children !== "no") {
    signals.push({ id: "children", emoji: "👶", key: "bothWantChildren" });
  }

  // 15% — children timeline closeness
  const tl = ordinalCloseness(TIMELINE_ORDER, viewer.children_timeline, candidate.children_timeline);
  score += tl * 15;
  if (tl >= 0.9 && viewer.children_timeline && candidate.children_timeline) {
    signals.push({ id: "timeline", emoji: "🍼", key: "sameTimeline" });
  }

  // 15% — relationship goal
  const goalMatch = viewer.relationship_goal && viewer.relationship_goal === candidate.relationship_goal;
  const goalScore = goalMatch ? 1 : candidate.relationship_goal ? 0.3 : 0.5;
  score += goalScore * 15;
  if (goalMatch) signals.push({ id: "goal", emoji: "🎯", key: "sameGoal" });

  // 10% — location / distance
  const sameCity =
    viewer.city && candidate.city && viewer.city.toLowerCase() === candidate.city.toLowerCase();
  const dist = distanceKm(viewer.lat, viewer.lng, candidate.lat, candidate.lng);
  let locScore = 0.5;
  if (sameCity) {
    locScore = 1;
    signals.push({ id: "city", emoji: "🌍", key: "sameCity" });
  } else if (dist != null) {
    const max = prefs?.distance_km ?? 200;
    locScore = Math.max(0, 1 - dist / Math.max(1, max));
    if (dist <= max) signals.push({ id: "near", emoji: "📍", key: "kmAway", values: { km: dist } });
  }
  score += locScore * 10;

  // 15% — lifestyle (smoking / drinking / religion / diet)
  const smoke = ordinalCloseness(SMOKE_ORDER, viewer.smoking, candidate.smoking);
  const drink = ordinalCloseness(DRINK_ORDER, viewer.drinking, candidate.drinking);
  const relig = viewer.religion && candidate.religion ? (viewer.religion === candidate.religion ? 1 : 0.3) : 0.5;
  const diet = viewer.diet && candidate.diet ? (viewer.diet === candidate.diet ? 1 : 0.4) : 0.5;
  const lifestyle = (smoke + drink + relig + diet) / 4;
  score += lifestyle * 15;
  if (viewer.smoking === "never" && candidate.smoking === "never") {
    signals.push({ id: "smoke", emoji: "🚭", key: "bothNonSmokers" });
  }
  if (viewer.religion && viewer.religion !== "none" && viewer.religion === candidate.religion) {
    signals.push({ id: "faith", emoji: "🙏", key: "sharedFaith" });
  }

  // 10% — age within preferred range
  const age = ageFromBirthDate(candidate.birth_date);
  let ageScore = 0.6;
  if (age != null) {
    const min = prefs?.age_min ?? 18;
    const max = prefs?.age_max ?? 99;
    ageScore = age >= min && age <= max ? 1 : 0.2;
  }
  score += ageScore * 10;

  // 5% — height + appearance soft prefs
  let appScore = 0.6;
  let appParts = 0;
  let appSum = 0;
  if (candidate.height_cm != null && (prefs?.height_min || prefs?.height_max)) {
    const min = prefs?.height_min ?? 140;
    const max = prefs?.height_max ?? 220;
    appSum += candidate.height_cm >= min && candidate.height_cm <= max ? 1 : 0.2;
    appParts++;
  }
  if (prefs?.eye_color?.length && candidate.eye_color) {
    appSum += prefs.eye_color.includes(candidate.eye_color) ? 1 : 0.3;
    appParts++;
  }
  if (prefs?.hair_color?.length && candidate.hair_color) {
    appSum += prefs.hair_color.includes(candidate.hair_color) ? 1 : 0.3;
    appParts++;
  }
  if (appParts > 0) appScore = appSum / appParts;
  score += appScore * 5;

  // 5% — misc (relocate, marriage)
  const marriage =
    viewer.wants_marriage && candidate.wants_marriage
      ? viewer.wants_marriage === candidate.wants_marriage
        ? 1
        : 0.4
      : 0.5;
  score += marriage * 5;
  if (viewer.wants_marriage === "yes" && candidate.wants_marriage === "yes") {
    signals.push({ id: "marriage", emoji: "💍", key: "bothWantMarriage" });
  }

  const rounded = Math.max(0, Math.min(100, Math.round(score)));

  // Per-axis sub-scores (0–100) for the compatibility breakdown UI.
  const pct = (v: number) => Math.max(0, Math.min(100, Math.round(v * 100)));
  const breakdown: AxisScore[] = [
    { key: "children", emoji: "👶", score: pct(wc * 0.6 + tl * 0.4) },
    { key: "values", emoji: "🎯", score: pct(goalScore * 0.6 + marriage * 0.4) },
    { key: "lifestyle", emoji: "🌿", score: pct(lifestyle) },
    { key: "location", emoji: "📍", score: pct(locScore) },
    { key: "faith", emoji: "🙏", score: pct(relig) },
  ];

  return { score: rounded, signals: signals.slice(0, 5), breakdown };
}