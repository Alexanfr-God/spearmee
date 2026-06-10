import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  const { data } = await admin
    .from("points_ledger")
    .select("points")
    .eq("profile_id", profileId);
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

    let awarded = 0;
    const { error } = await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: data.action,
      points: rule.points,
      dedupe_key: dedupeKey,
    });
    if (!error) awarded = rule.points;
    else if (error.code !== "23505") throw error;

    const total = await sumPoints(supabaseAdmin, userId);
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count")
      .eq("id", userId)
      .maybeSingle();

    return {
      total,
      awarded,
      level: levelForPoints(total),
      streak: prof?.streak_count ?? 0,
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
    const yesterdayStr = new Date(today.getTime() - 86400000)
      .toISOString()
      .slice(0, 10);

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("streak_count, last_streak_date")
      .eq("id", userId)
      .maybeSingle();

    let streak = prof?.streak_count ?? 0;
    const last = prof?.last_streak_date ?? null;

    if (last !== todayStr) {
      streak = last === yesterdayStr ? streak + 1 : 1;
      await supabaseAdmin
        .from("profiles")
        .update({ streak_count: streak, last_streak_date: todayStr })
        .eq("id", userId);
    }

    await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: "daily_login",
      points: RULES.daily_login.points,
      dedupe_key: `daily_login:${todayStr}`,
    });

    const total = await sumPoints(supabaseAdmin, userId);
    return { total, awarded: 0, level: levelForPoints(total), streak };
  });
