import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  message_id: z.string().uuid().optional(),
  text: z.string().max(4000).optional(),
  target_lang: z.string().min(2).max(8),
  source_lang: z.string().min(2).max(8).optional(),
});

/**
 * Translation provider adapter. Swap the implementation here to change provider.
 * TODO: set provider — when TRANSLATE_API_KEY is configured, call the real
 * translation API (e.g. DeepL / Google / an LLM). Until then we return a mock
 * that tags the text so the end-to-end flow can be tested.
 */
async function translateProvider(
  text: string,
  targetLang: string,
  _sourceLang?: string | null,
): Promise<string> {
  const apiKey = process.env.TRANSLATE_API_KEY;
  if (!apiKey) {
    // MOCK fallback — echoes the text tagged with the target language.
    return `[${targetLang}] ${text}`;
  }
  // TODO: implement the real provider call using `apiKey`, `text`,
  // `targetLang`, and `_sourceLang`. Return only the translated string.
  return `[${targetLang}] ${text}`;
}

/**
 * Translates a chat message into the reader's language. Results are cached in
 * message_translations so each (message, lang) pair is computed only once.
 */
export const translateMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let text = data.text ?? "";
    const source = data.source_lang ?? null;

    if (data.message_id) {
      // Return cache if present.
      const { data: cached } = await supabaseAdmin
        .from("message_translations")
        .select("text")
        .eq("message_id", data.message_id)
        .eq("lang", data.target_lang)
        .maybeSingle();
      if (cached) return { text: cached.text, cached: true as const };

      // Load message + verify the caller is a member of the match.
      const { data: msg } = await supabaseAdmin
        .from("messages")
        .select("id, body, match_id")
        .eq("id", data.message_id)
        .maybeSingle();
      if (!msg) throw new Error("Message not found");
      const { data: match } = await supabaseAdmin
        .from("matches")
        .select("user_a, user_b")
        .eq("id", msg.match_id)
        .maybeSingle();
      if (!match || (match.user_a !== userId && match.user_b !== userId)) {
        throw new Error("Not a member of this match");
      }
      text = msg.body;
    }

    if (!text) return { text: "", cached: false as const };

    const translated = await translateProvider(text, data.target_lang, source);

    if (data.message_id) {
      await supabaseAdmin
        .from("message_translations")
        .upsert(
          { message_id: data.message_id, lang: data.target_lang, text: translated },
          { onConflict: "message_id,lang" },
        );
    }

    return { text: translated, cached: false as const };
  });