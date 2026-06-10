import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({ match_id: z.string().uuid() });

const LANG_NAME: Record<string, string> = {
  en: "English",
  ru: "Russian",
  ko: "Korean",
};

const PROFILE_FIELDS =
  "id, display_name, bio, city, country, language_code, wants_children, children_timeline, relationship_goal, religion, diet, exercise, smoking";

function mockSuggestions(lang: string): string[] {
  if (lang === "ru") {
    return [
      "Что для тебя идеальные выходные с семьёй?",
      "Какое место мечтаешь однажды посетить вместе?",
      "Что в жизни даёт тебе больше всего радости?",
    ];
  }
  if (lang === "ko") {
    return [
      "가족과 함께하는 완벽한 주말은 어떤 모습인가요?",
      "언젠가 함께 가보고 싶은 곳이 있나요?",
      "요즘 가장 큰 즐거움은 무엇인가요?",
    ];
  }
  return [
    "What does an ideal family weekend look like for you?",
    "Where would you love to travel together one day?",
    "What brings you the most joy lately?",
  ];
}

/**
 * AI Ice-breaker — generates 2–3 short, warm, personal opening questions
 * for a match based on both users' shared signals and bios.
 * Uses Lovable AI (gemini-flash). Falls back to localized mock prompts.
 */
export const generateIcebreakers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: match } = await supabaseAdmin
      .from("matches")
      .select("id, user_a, user_b")
      .eq("id", data.match_id)
      .maybeSingle();
    if (!match) throw new Error("Match not found");
    if (match.user_a !== userId && match.user_b !== userId) {
      throw new Error("Not a member of this match");
    }

    const otherId = match.user_a === userId ? match.user_b : match.user_a;
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select(PROFILE_FIELDS)
      .in("id", [userId, otherId]);

    const me = profs?.find((p) => p.id === userId);
    const other = profs?.find((p) => p.id === otherId);
    const lang = me?.language_code ?? "en";

    // Log premium intent (free in MVP).
    await supabaseAdmin.from("premium_intent_events").insert({
      profile_id: userId,
      event_type: "icebreaker",
      context: { match_id: data.match_id },
    });

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey || !other) {
      return { suggestions: mockSuggestions(lang) };
    }

    const langName = LANG_NAME[lang] ?? "English";
    const describe = (p: typeof other) =>
      [
        p?.display_name ? `name: ${p.display_name}` : null,
        p?.city ? `city: ${p.city}` : null,
        p?.relationship_goal ? `goal: ${p.relationship_goal}` : null,
        p?.wants_children ? `children: ${p.wants_children}` : null,
        p?.religion && p.religion !== "none" ? `faith: ${p.religion}` : null,
        p?.diet ? `diet: ${p.diet}` : null,
        p?.exercise ? `exercise: ${p.exercise}` : null,
        p?.bio ? `bio: ${p.bio}` : null,
      ]
        .filter(Boolean)
        .join(", ");

    const prompt = `You help two people on a serious-relationship dating app start a warm conversation.
Me: ${describe(me as typeof other)}
Them: ${describe(other)}
Write exactly 3 short, friendly, specific opening questions I could send them, based on what we have in common. Keep each under 15 words, warm and genuine, never generic. Write them in ${langName}.
Return ONLY a JSON object: {"suggestions": ["q1","q2","q3"]}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a thoughtful matchmaking assistant. Always reply with valid JSON only." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (res.status === 429) {
        return { suggestions: mockSuggestions(lang), error: "rate_limit" as const };
      }
      if (res.status === 402) {
        return { suggestions: mockSuggestions(lang), error: "no_credits" as const };
      }
      if (!res.ok) {
        return { suggestions: mockSuggestions(lang) };
      }

      const json = await res.json();
      const content: string = json?.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content);
      const suggestions: string[] = Array.isArray(parsed?.suggestions)
        ? parsed.suggestions.filter((s: unknown) => typeof s === "string").slice(0, 3)
        : [];
      if (suggestions.length === 0) return { suggestions: mockSuggestions(lang) };
      return { suggestions };
    } catch {
      return { suggestions: mockSuggestions(lang) };
    }
  });
