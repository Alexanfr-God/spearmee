import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNav } from "@/components/nav";
import { signedUrls } from "@/lib/helpers";
import { haptic } from "@/lib/telegram";

interface MatchRow {
  id: string;
  otherId: string;
  name: string | null;
  photoUrl?: string;
  lastMessage?: string;
  lastFromMe?: boolean;
}

export function MatchesScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const nav = useNav();
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id, user_a, user_b, created_at")
        .order("created_at", { ascending: false });
      const list = matches ?? [];
      const otherIds = list.map((m) => (m.user_a === profile.id ? m.user_b : m.user_a));

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"]);
      const { data: photos } = await supabase
        .from("photos")
        .select("profile_id, storage_path, position")
        .in("profile_id", otherIds.length ? otherIds : ["00000000-0000-0000-0000-000000000000"])
        .order("position", { ascending: true });

      const photoPaths = otherIds
        .map((id) => (photos ?? []).find((p) => p.profile_id === id)?.storage_path)
        .filter(Boolean) as string[];
      const urls = await signedUrls(photoPaths);

      const built: MatchRow[] = [];
      for (const m of list) {
        const otherId = m.user_a === profile.id ? m.user_b : m.user_a;
        const prof = (profs ?? []).find((p) => p.id === otherId);
        const path = (photos ?? []).find((p) => p.profile_id === otherId)?.storage_path;
        const { data: lastMsg } = await supabase
          .from("messages")
          .select("body, sender_id")
          .eq("match_id", m.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        built.push({
          id: m.id,
          otherId,
          name: prof?.display_name ?? null,
          photoUrl: path ? urls[path] : undefined,
          lastMessage: lastMsg?.body,
          lastFromMe: lastMsg?.sender_id === profile.id,
        });
      }
      setRows(built);
      setLoading(false);
    })();
  }, [profile]);

  return (
    <div className="px-4 pt-4">
      <h1 className="mb-3 text-2xl font-bold text-foreground">{t("matches.title")}</h1>
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">{t("matches.empty")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => {
                  haptic("light");
                  nav.openChat(r.id);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left active:bg-accent"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-secondary">
                  {r.photoUrl ? (
                    <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">🌿</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">{r.name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {r.lastMessage
                      ? (r.lastFromMe ? t("matches.you") : "") + r.lastMessage
                      : t("matches.noMessages")}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}