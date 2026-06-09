import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHmac } from "node:crypto";

import { normalizeLang } from "@/lib/i18n";

const inputSchema = z.object({
  initData: z.string().optional(),
  // DEMO ONLY: lets the app be previewed outside Telegram.
  // TODO: remove demo login before production launch.
  demo: z
    .object({ id: z.number(), first_name: z.string().optional() })
    .optional(),
});

interface TgUser {
  id: number;
  first_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

function validateInitData(initData: string, botToken: string): TgUser | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const pairs = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort();
  const dataCheckString = pairs.join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computed = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  if (computed !== hash) return null;
  const userStr = params.get("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as TgUser;
  } catch {
    return null;
  }
}

/**
 * Validates Telegram initData, upserts the profile, and returns credentials the
 * client uses to obtain a Supabase session (so RLS works).
 */
export const tgAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => inputSchema.parse(d))
  .handler(async ({ data }) => {
    const botToken = process.env.BOT_TOKEN;
    if (!botToken) throw new Error("BOT_TOKEN is not configured");

    let tgUser: TgUser | null = null;
    if (data.initData && data.initData.length > 0) {
      tgUser = validateInitData(data.initData, botToken);
      if (!tgUser) throw new Error("Invalid Telegram initData signature");
    } else if (data.demo) {
      // TODO: remove demo login before production launch.
      tgUser = {
        id: data.demo.id,
        first_name: data.demo.first_name ?? "Demo",
        username: undefined,
        language_code: "en",
      };
    }
    if (!tgUser) throw new Error("No Telegram credentials provided");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = `tg${tgUser.id}@spearmee.app`;
    const password = createHmac("sha256", botToken)
      .update(`pw:${tgUser.id}`)
      .digest("hex");
    const lang = normalizeLang(tgUser.language_code);

    // Find existing profile (profiles.id == auth user id).
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id, onboarded")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    let userId: string;
    let onboarded = false;

    if (existing) {
      userId = existing.id;
      onboarded = existing.onboarded ?? false;
      // Keep the auth password in sync with the deterministic value.
      await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      await supabaseAdmin
        .from("profiles")
        .update({ last_active: new Date().toISOString() })
        .eq("id", userId);
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { telegram_id: tgUser.id },
      });

      if (created.error || !created.data.user) {
        // Fallback: auth user may already exist without a profile row.
        const list = await supabaseAdmin.auth.admin.listUsers();
        const found = list.data.users.find((u) => u.email === email);
        if (!found) throw new Error("Failed to create user");
        userId = found.id;
        await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      } else {
        userId = created.data.user.id;
      }

      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          telegram_id: tgUser.id,
          username: tgUser.username ?? null,
          display_name: tgUser.first_name ?? null,
          language_code: lang,
          last_active: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    }

    return { email, password, onboarded };
  });