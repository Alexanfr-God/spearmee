import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const READY_MATCHES = 5;

export interface DevSeedResult {
  femaleTotal: number;
  femaleWithPhotos: number;
  likesSeeded: number;
  matchesCreated: number;
}

/**
 * DEV ONLY — reseeds the *calling* user's discovery/matches state so the demo
 * is testable end-to-end. It:
 *  - clears the caller's daily set + outgoing swipes (Discover refills fresh),
 *  - makes every onboarded female profile "like" the caller (so any like-back
 *    is an instant match), and
 *  - pre-creates a handful of ready matches, preferring profiles that have a
 *    photo so AI-baby generation works on them.
 * Uses the authenticated session's userId, so it never depends on display_name.
 *
 * TODO: gate behind a dev flag or remove before public launch.
 */
export const devResetAndSeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DevSeedResult> => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Reset my discovery state so Discover regenerates and all profiles return.
    await supabaseAdmin.from("daily_sets").delete().eq("profile_id", userId);
    await supabaseAdmin.from("swipes").delete().eq("swiper_id", userId);

    // 2) All onboarded female profiles besides me.
    const { data: females } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("onboarded", true)
      .eq("gender", "female")
      .neq("id", userId);
    const femaleIds = (females ?? []).map((p) => p.id);
    if (femaleIds.length === 0) {
      return { femaleTotal: 0, femaleWithPhotos: 0, likesSeeded: 0, matchesCreated: 0 };
    }

    // Which of them have at least one photo (AI-baby needs both sides to have one).
    const { data: photoRows } = await supabaseAdmin
      .from("photos")
      .select("profile_id")
      .in("profile_id", femaleIds);
    const withPhotos = [...new Set((photoRows ?? []).map((r) => r.profile_id))];
    const withPhotoSet = new Set(withPhotos);

    // 3) Every female likes me (incoming likes); dedupe on the unique pair.
    await supabaseAdmin.from("swipes").upsert(
      femaleIds.map((id) => ({ swiper_id: id, target_id: userId, action: "like" })),
      { onConflict: "swiper_id,target_id", ignoreDuplicates: true },
    );

    // 4) Pre-create ready matches: I like a few back (photo-having first), so the
    //    existing handle_swipe_match trigger inserts the match rows.
    const ordered = [...withPhotos, ...femaleIds.filter((id) => !withPhotoSet.has(id))];
    const toMatch = ordered.slice(0, READY_MATCHES);
    await supabaseAdmin.from("swipes").upsert(
      toMatch.map((id) => ({ swiper_id: userId, target_id: id, action: "like" })),
      { onConflict: "swiper_id,target_id", ignoreDuplicates: true },
    );

    return {
      femaleTotal: femaleIds.length,
      femaleWithPhotos: withPhotos.length,
      likesSeeded: femaleIds.length,
      matchesCreated: toMatch.length,
    };
  });
