import { createServerFn } from "@tanstack/react-start";
import { type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RP_PER_RUN_CAP = 20;
const RP_DAILY_CAP = 50;
const MAX_SCORE = 100000;

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

export interface SubmitScoreResult {
  rpAwarded: number;
  total: number;
  best: number;
  capped: boolean;
}

/**
 * Records a Spearmee Run score and awards RP, capped per run and per UTC day.
 * Always writes a `game` ledger row (even 0 RP) so the daily "play" quest can
 * detect that the user played today.
 */
export const submitGameScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ score: z.number().int().min(0).max(MAX_SCORE) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<SubmitScoreResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // game_scores is a new table not yet in the generated Supabase types.
    const admin = supabaseAdmin as unknown as SupabaseClient;
    const now = new Date();
    const week = isoWeekKey(now);
    const score = data.score;

    await admin.from("game_scores").insert({ profile_id: userId, score, week_key: week });

    const { data: bestRow } = await admin
      .from("game_scores")
      .select("score")
      .eq("profile_id", userId)
      .eq("week_key", week)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();
    const best = (bestRow as { score?: number } | null)?.score ?? score;

    const dayStart = now.toISOString().slice(0, 10) + "T00:00:00.000Z";
    const { data: todayGame } = await supabaseAdmin
      .from("points_ledger")
      .select("points")
      .eq("profile_id", userId)
      .eq("action", "game")
      .gte("created_at", dayStart);
    const earnedToday = (todayGame ?? []).reduce((a, r) => a + (r.points ?? 0), 0);
    const runRP = Math.min(Math.floor(score / 100), RP_PER_RUN_CAP);
    const grant = Math.max(0, Math.min(runRP, RP_DAILY_CAP - earnedToday));

    await supabaseAdmin.from("points_ledger").insert({
      profile_id: userId,
      action: "game",
      points: grant,
      dedupe_key: null,
    });

    const { data: ledger } = await supabaseAdmin
      .from("points_ledger")
      .select("points")
      .eq("profile_id", userId);
    const total = (ledger ?? []).reduce((a, r) => a + (r.points ?? 0), 0);

    return { rpAwarded: grant, total, best, capped: grant < runRP };
  });

export interface LeaderRow {
  rank: number;
  name: string;
  score: number;
  isMe: boolean;
}

export interface LeaderboardResult {
  top: LeaderRow[];
  myRank: number | null;
  myBest: number;
}

/** This week's leaderboard: each user's best score, top 20, plus my rank. */
export const getLeaderboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LeaderboardResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as unknown as SupabaseClient;
    const week = isoWeekKey(new Date());

    const { data: rowsRaw } = await admin
      .from("game_scores")
      .select("profile_id, score")
      .eq("week_key", week)
      .order("score", { ascending: false })
      .limit(500);
    const rows = (rowsRaw ?? []) as { profile_id: string; score: number }[];

    const bestByUser = new Map<string, number>();
    for (const r of rows) if (!bestByUser.has(r.profile_id)) bestByUser.set(r.profile_id, r.score);
    const ranked = [...bestByUser.entries()].sort((a, b) => b[1] - a[1]);

    const topIds = ranked.slice(0, 20).map(([id]) => id);
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name")
      .in("id", topIds.length ? topIds : ["00000000-0000-0000-0000-000000000000"]);
    const nameById = new Map((profs ?? []).map((p) => [p.id, p.display_name]));

    const top: LeaderRow[] = ranked.slice(0, 20).map(([id, score], i) => ({
      rank: i + 1,
      name: nameById.get(id) ?? "—",
      score,
      isMe: id === userId,
    }));
    const myIndex = ranked.findIndex(([id]) => id === userId);
    return { top, myRank: myIndex >= 0 ? myIndex + 1 : null, myBest: bestByUser.get(userId) ?? 0 };
  });
