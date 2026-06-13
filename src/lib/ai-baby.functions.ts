import { createServerFn } from "@tanstack/react-start";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ match_id: z.string().uuid() });

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
// Multimodal image model that accepts the two parent photos as input and
// returns a blended image. Alternatives via the same gateway: "openai/gpt-image-2".
const IMAGE_MODEL = "google/gemini-2.5-flash-image-preview";
// Max generations per match per UTC day — caps cost/abuse while allowing retries.
const DAILY_CAP = 5;

const BABY_PROMPT =
  "You are generating a light-hearted, clearly fictional 'what might our future baby look like' " +
  "preview for a couple on a dating app. Using ONLY the two attached face photos as a soft visual " +
  "reference, create a single photorealistic portrait of one cute baby (around 12 months old) that " +
  "plausibly blends their facial features, skin tone, hair and eye color. Soft neutral background, " +
  "gentle lighting, friendly expression. Output exactly one image.";

export type AiBabyReason = "need_photos" | "rate_limit" | "no_credits" | "unavailable" | "error";

type AiBabyResult = { ok: true; image_url: string | null } | { ok: false; reason: AiBabyReason };

/**
 * AI Baby "fun preview" — real generation via the Lovable AI gateway
 * (multimodal image model). Both matched users' first photos are sent as soft
 * visual references; the blended result is stored in the private `baby` bucket
 * and returned as a short-lived signed URL. Only face photos are used — never
 * the appearance fields users typed (see the on-screen disclaimer).
 */
export const generateAiBaby = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }): Promise<AiBabyResult> => {
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate-limit: cap generations per match per UTC day. Only successful
    // generations insert a row, so failed attempts never count against the cap.
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await supabaseAdmin
      .from("ai_baby_results")
      .select("id", { count: "exact", head: true })
      .eq("match_id", data.match_id)
      .gte("created_at", dayStart.toISOString());
    if ((count ?? 0) >= DAILY_CAP) {
      return { ok: false, reason: "rate_limit" };
    }

    // Both matched users' first (main) photos.
    const userIds = [match.user_a, match.user_b];
    const { data: photos } = await supabase
      .from("photos")
      .select("profile_id, storage_path, position")
      .in("profile_id", userIds)
      .order("position", { ascending: true });
    const firstFor = (pid: string) => photos?.find((p) => p.profile_id === pid)?.storage_path;
    const pathA = firstFor(match.user_a);
    const pathB = firstFor(match.user_b);
    if (!pathA || !pathB) {
      return { ok: false, reason: "need_photos" };
    }

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      // No AI configured (e.g. local dev without the Lovable Cloud secret).
      return { ok: false, reason: "unavailable" };
    }

    // Download both face photos and inline them as data URLs for the model.
    const toDataUrl = async (path: string): Promise<string | null> => {
      const { data: blob, error } = await supabaseAdmin.storage.from("photos").download(path);
      if (error || !blob) return null;
      const buf = Buffer.from(await blob.arrayBuffer());
      const mime = blob.type || "image/jpeg";
      return `data:${mime};base64,${buf.toString("base64")}`;
    };
    const [imgA, imgB] = await Promise.all([toDataUrl(pathA), toDataUrl(pathB)]);
    if (!imgA || !imgB) return { ok: false, reason: "error" };

    // Generate the blended baby image.
    let dataUrl: string | null = null;
    try {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          modalities: ["image", "text"],
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: BABY_PROMPT },
                { type: "image_url", image_url: { url: imgA } },
                { type: "image_url", image_url: { url: imgB } },
              ],
            },
          ],
        }),
      });

      if (res.status === 429) return { ok: false, reason: "rate_limit" };
      if (res.status === 402) return { ok: false, reason: "no_credits" };
      if (!res.ok) return { ok: false, reason: "error" };

      const json = await res.json();
      const msg = json?.choices?.[0]?.message;
      dataUrl =
        msg?.images?.[0]?.image_url?.url ??
        msg?.images?.[0]?.url ??
        (typeof msg?.content === "string" && msg.content.startsWith("data:") ? msg.content : null);
    } catch {
      return { ok: false, reason: "error" };
    }
    if (!dataUrl) return { ok: false, reason: "error" };

    // Decode the returned data URL and store it in the private `baby` bucket.
    const parsed = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(dataUrl);
    if (!parsed) return { ok: false, reason: "error" };
    const [, mime, b64] = parsed;
    const ext = mime.split("/")[1]?.split("+")[0] || "png";
    const bytes = Buffer.from(b64, "base64");
    const objectPath = `${data.match_id}/${randomUUID()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("baby")
      .upload(objectPath, bytes, { contentType: mime, upsert: false });
    if (upErr) return { ok: false, reason: "error" };

    await supabaseAdmin.from("ai_baby_results").insert({
      match_id: data.match_id,
      requested_by: userId,
      image_url: objectPath, // store the storage path; sign on read
    });

    await supabaseAdmin.from("premium_intent_events").insert({
      profile_id: userId,
      event_type: "ai_baby",
      context: { match_id: data.match_id },
    });

    const { data: signed } = await supabaseAdmin.storage
      .from("baby")
      .createSignedUrl(objectPath, 60 * 60 * 24 * 7);

    return { ok: true, image_url: signed?.signedUrl ?? null };
  });
