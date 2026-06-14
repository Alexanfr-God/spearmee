import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PERK_COSTS, MULTIPLIER_TIERS } from "@/lib/perks";

/**
 * Server-authoritative points economy. The client may only request an action
 * by name; the points amount and dedupe rules are decided here, never trusted
 * from the client.
 */
export type PointsAction =
  | "profile_complete"
  | "verified"
  | "daily_login"
  | "send_message"
  | "icebreaker_used"
  | "got_match";

interface ActionRule {
  points: number;
  /** Builds the dedupe key (null = repeatable, no dedupe). */
  dedupe?: (today: string) => string;
}

const RULES: Record<PointsAction, ActionRule> = {
  profile_complete: { points: 50, dedupe: () => "profile_complete" },
  verified: { points: 100, dedupe: () => "verified" },
  daily_login: { points: 10, dedupe: (today) => `daily_login:${today}` },
  got_match: { points: 20 },
  send_message: { points: 5, dedupe: (today) => `send_message:${today}` },
  icebreaker_used: { points: 5, dedupe: (today) => `icebreaker_used:${today}` },
};

export interface PointsState {
  total: number;
  awarded: number;
  level: number;
  streak: number;
  multiplier?: number;
  multiplierUntil?: string | null;
}

interface EarnProfile {
  earn_multiplier?: number | null;
  earn_multiplier_until?: string | null;
}

/** The active earn multiplier (×1 when none or expired). */
function activeMultiplier(prof: EarnProfile | null): number {
  const m = prof?.earn_multiplier;
  const until = prof?.earn_multiplier_until;
  if (!m || !until) return 1;
  return new Date(until).getTime() > Date.now() ? m : 1;
}

function levelForPoints(total: number): number {
  if (total >= 1000) return 4;
  if (total >= 600) return 3;
  if (total >= 300) return 2;
  if (total >= 100) return 1;
  return 0;
}

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

async function sumPoints(admin: Admin, profileId: string): Promise<number> {
  const { data } = await admin.from("points_ledger").select("points").eq("profile_id", profileId);
  return (data ?? []).reduce((acc, r) => acc + (r.points ?? 0), 0);
}

/** Award points for a single quality action (idempotent where a dedupe key exists). */
export const awardPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { action: PointsAction }) => input)
  .handler(async ({ data, context }): Promise<PointsState> => {
    const { userId } = context;
    const rule = RULES[data.action];
    if (!rule) throw new Error("Unknown action");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date().toISOString().slice(0, 10);
    const dedupeKey = rule.dedupe ? rule.dedupe(today) : null;

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count, earn_multiplier, earn_multiplier_until")
      .eq("id", userId)
      .maybeSingle();
    const mult = activeMultiplier(prof as EarnProfile | null);
    const points = Math.round(rule.points * mult);

    let awarded = 0;
    const { error } = await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: data.action,
      points,
      dedupe_key: dedupeKey,
    });
    if (!error) awarded = points;
    else if (error.code !== "23505") throw error;

    const total = await sumPoints(supabaseAdmin, userId);
    return {
      total,
      awarded,
      level: levelForPoints(total),
      streak: (prof as { streak_count?: number | null } | null)?.streak_count ?? 0,
      multiplier: mult,
      multiplierUntil: (prof as EarnProfile | null)?.earn_multiplier_until ?? null,
    };
  });

/** Reads the current points/level/streak for the signed-in user. */
export const getPointsState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PointsState> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const total = await sumPoints(supabaseAdmin, userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count")
      .eq("id", userId)
      .maybeSingle();
    return {
      total,
      awarded: 0,
      level: levelForPoints(total),
      streak: prof?.streak_count ?? 0,
    };
  });

/**
 * Registers a daily visit: bumps the consecutive-day streak and awards the
 * daily-login points. Called once on app open.
 */
export const registerDailyVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PointsState> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const yesterdayStr = new Date(today.getTime() - 86400000).toISOString().slice(0, 10);

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count, last_streak_date, earn_multiplier, earn_multiplier_until")
      .eq("id", userId)
      .maybeSingle();

    let streak = (prof as { streak_count?: number | null } | null)?.streak_count ?? 0;
    const last = (prof as { last_streak_date?: string | null } | null)?.last_streak_date ?? null;

    if (last !== todayStr) {
      streak = last === yesterdayStr ? streak + 1 : 1;
      await supabaseAdmin
        .from("profiles")
        .update({ streak_count: streak, last_streak_date: todayStr })
        .eq("id", userId);
    }

    const mult = activeMultiplier(prof as EarnProfile | null);
    await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: "daily_login",
      points: Math.round(RULES.daily_login.points * mult),
      dedupe_key: `daily_login:${todayStr}`,
    });

    const total = await sumPoints(supabaseAdmin, userId);
    return {
      total,
      awarded: 0,
      level: levelForPoints(total),
      streak,
      multiplier: mult,
      multiplierUntil: (prof as EarnProfile | null)?.earn_multiplier_until ?? null,
    };
  });

// =========================================================
// QUESTS — goal-based bonuses. RP = in-app perks only (no crypto).
// Idempotency reuses points_ledger's unique (profile_id, dedupe_key).
// =========================================================
export type QuestType = "daily" | "weekly" | "once";

export interface QuestDef {
  key: string;
  type: QuestType;
  points: number;
  goal: number;
}

const QUESTS: QuestDef[] = [
  { key: "daily_resonate", type: "daily", points: 15, goal: 5 },
  { key: "daily_message", type: "daily", points: 10, goal: 1 },
  { key: "weekly_streak", type: "weekly", points: 30, goal: 3 },
  { key: "weekly_match", type: "weekly", points: 25, goal: 1 },
  { key: "once_photos", type: "once", points: 20, goal: 3 },
  { key: "once_prefs", type: "once", points: 15, goal: 1 },
  { key: "once_verify", type: "once", points: 50, goal: 1 },
  { key: "once_profile", type: "once", points: 25, goal: 1 },
];

export interface QuestState extends QuestDef {
  progress: number;
  claimed: boolean;
  claimable: boolean;
}

function isoWeekKey(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${d.getUTCFullYear()}-W${week}`;
}

function periodKey(type: QuestType, now: Date): string {
  if (type === "once") return "once";
  if (type === "daily") return now.toISOString().slice(0, 10);
  return isoWeekKey(now);
}

function dedupeFor(q: QuestDef, now: Date): string {
  return `quest:${q.key}:${periodKey(q.type, now)}`;
}

interface QuestProfile {
  streak_count: number | null;
  verified: boolean | null;
  onboarded: boolean | null;
}

async function computeQuestStats(
  admin: Admin,
  userId: string,
  prof: QuestProfile | null,
  now: Date,
): Promise<Record<string, number>> {
  const dayStart = now.toISOString().slice(0, 10) + "T00:00:00.000Z";
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();

  const [swipes, messages, photos, matches, prefs] = await Promise.all([
    admin
      .from("swipes")
      .select("id", { count: "exact", head: true })
      .eq("swiper_id", userId)
      .in("action", ["like", "superlike"])
      .gte("created_at", dayStart),
    admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .gte("created_at", dayStart),
    admin.from("photos").select("id", { count: "exact", head: true }).eq("profile_id", userId),
    admin
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .gte("created_at", weekAgo),
    admin.from("preferences").select("id", { count: "exact", head: true }).eq("profile_id", userId),
  ]);

  return {
    daily_resonate: swipes.count ?? 0,
    daily_message: messages.count ?? 0,
    weekly_streak: prof?.streak_count ?? 0,
    weekly_match: matches.count ?? 0,
    once_photos: photos.count ?? 0,
    once_prefs: (prefs.count ?? 0) > 0 ? 1 : 0,
    once_verify: prof?.verified ? 1 : 0,
    once_profile: prof?.onboarded ? 1 : 0,
  };
}

/** Returns each quest's progress + claim state, plus current points. */
export const getQuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ quests: QuestState[]; state: PointsState }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count, verified, onboarded, earn_multiplier, earn_multiplier_until")
      .eq("id", userId)
      .maybeSingle();

    const stats = await computeQuestStats(supabaseAdmin, userId, prof, now);

    const keys = QUESTS.map((q) => dedupeFor(q, now));
    const { data: claimedRows } = await supabaseAdmin
      .from("points_ledger")
      .select("dedupe_key")
      .eq("profile_id", userId)
      .in("dedupe_key", keys);
    const claimedSet = new Set((claimedRows ?? []).map((r) => r.dedupe_key));

    const quests: QuestState[] = QUESTS.map((q) => {
      const progress = Math.min(q.goal, stats[q.key] ?? 0);
      const claimed = claimedSet.has(dedupeFor(q, now));
      return { ...q, progress, claimed, claimable: progress >= q.goal && !claimed };
    });

    const total = await sumPoints(supabaseAdmin, userId);
    return {
      quests,
      state: {
        total,
        awarded: 0,
        level: levelForPoints(total),
        streak: (prof as { streak_count?: number | null } | null)?.streak_count ?? 0,
        multiplier: activeMultiplier(prof as EarnProfile | null),
        multiplierUntil: (prof as EarnProfile | null)?.earn_multiplier_until ?? null,
      },
    };
  });

/** Claims a completed quest, awarding its bonus RP (idempotent per period). */
export const claimQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => input)
  .handler(async ({ data, context }): Promise<PointsState & { ok: boolean }> => {
    const { userId } = context;
    const q = QUESTS.find((x) => x.key === data.key);
    if (!q) throw new Error("Unknown quest");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count, verified, onboarded, earn_multiplier, earn_multiplier_until")
      .eq("id", userId)
      .maybeSingle();

    const stats = await computeQuestStats(supabaseAdmin, userId, prof, now);
    const streak = (prof as { streak_count?: number | null } | null)?.streak_count ?? 0;
    const mult = activeMultiplier(prof as EarnProfile | null);

    if ((stats[q.key] ?? 0) < q.goal) {
      const total = await sumPoints(supabaseAdmin, userId);
      return { ok: false, total, awarded: 0, level: levelForPoints(total), streak };
    }

    const points = Math.round(q.points * mult);
    let awarded = 0;
    const { error } = await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: "quest",
      points,
      dedupe_key: dedupeFor(q, now),
    });
    if (!error) awarded = points;
    else if (error.code !== "23505") throw error; // already claimed → no-op

    const total = await sumPoints(supabaseAdmin, userId);
    return { ok: awarded > 0, total, awarded, level: levelForPoints(total), streak };
  });

/** Spend RP to boost your profile in others' discovery for one hour. */
export const buyBoost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: boolean; reason?: "not_enough"; total: number }> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const balance = await sumPoints(supabaseAdmin, userId);
    if (balance < PERK_COSTS.boost) {
      return { ok: false, reason: "not_enough", total: balance };
    }

    await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: "perk:boost",
      points: -PERK_COSTS.boost,
      dedupe_key: null,
    });
    await supabaseAdmin
      .from("profiles")
      .update({ boost_until: new Date(Date.now() + 3600000).toISOString() } as never)
      .eq("id", userId);

    return { ok: true, total: balance - PERK_COSTS.boost };
  });

/** Spend RP to set an earn multiplier for a window (buying replaces the active one). */
export const buyMultiplier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { value: number }) => input)
  .handler(
    async ({ data, context }): Promise<{ ok: boolean; reason?: "not_enough"; total: number }> => {
      const { userId } = context;
      const tier = MULTIPLIER_TIERS.find((tr) => tr.value === data.value);
      if (!tier) throw new Error("Unknown tier");

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const balance = await sumPoints(supabaseAdmin, userId);
      if (balance < tier.cost) {
        return { ok: false, reason: "not_enough", total: balance };
      }

      await supabaseAdmin.from("points_ledger").insert({
        profile_id: userId,
        action: "perk:multiplier",
        points: -tier.cost,
        dedupe_key: null,
      });
      await supabaseAdmin
        .from("profiles")
        .update({
          earn_multiplier: tier.value,
          earn_multiplier_until: new Date(Date.now() + tier.days * 86400000).toISOString(),
        } as never)
        .eq("id", userId);

      return { ok: true, total: balance - tier.cost };
    },
  );
