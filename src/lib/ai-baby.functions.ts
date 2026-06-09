import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ match_id: z.string().uuid() });

/**
 * AI Baby "fun preview" — MVP MOCK.
 * Fetches both matched users' first photos and returns a preview image URL.
 * Currently it returns a blended placeholder (one parent photo). The full
 * interface is in place so a real image model can be swapped in later.
 */
export const generateAiBaby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Confirm membership + get the two users.
    const { data: match, error: matchErr } = await supabase
      .from("matches")
      .select("id, user_a, user_b")
      .eq("id", data.match_id)
      .maybeSingle();
    if (matchErr || !match) throw new Error("Match not found");
    if (match.user_a !== userId && match.user_b !== userId) {
      throw new Error("Not a member of this match");
    }

    const userIds = [match.user_a, match.user_b];
    const { data: photos } = await supabase
      .from("photos")
      .select("profile_id, storage_path, position")
      .in("profile_id", userIds)
      .order("position", { ascending: true });

    const firstFor = (pid: string) =>
      photos?.find((p) => p.profile_id === pid)?.storage_path;
    const pathA = firstFor(match.user_a);
    const pathB = firstFor(match.user_b);
    if (!pathA || !pathB) {
      return { ok: false as const, reason: "need_photos" as const };
    }

    // TODO: plug real image model here.
    // Real implementation: download both photos, send to an image model that
    // blends parental features, upload the result, and use its public URL.
    // For the MVP we return a signed URL of one parent photo as a placeholder.
    const { data: signed } = await supabase.storage
      .from("photos")
      .createSignedUrl(pathA, 60 * 60 * 24 * 7);
    const imageUrl = signed?.signedUrl ?? null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    await supabaseAdmin.from("ai_baby_results").insert({
      match_id: data.match_id,
      requested_by: userId,
      image_url: pathA, // store the storage path; sign on read
    });

    await supabaseAdmin.from("premium_intent_events").insert({
      profile_id: userId,
      event_type: "ai_baby",
      context: { match_id: data.match_id },
    });

    return { ok: true as const, image_url: imageUrl };
  });