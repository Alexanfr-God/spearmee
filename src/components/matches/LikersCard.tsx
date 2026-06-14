import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Heart, Loader2, Lock } from "lucide-react";

import { getLikers, revealLikers, type LikersResult } from "@/lib/daily.functions";
import { PERK_COSTS } from "@/lib/perks";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/telegram";
import { Button } from "@/components/ui/button";

export function LikersCard() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const callGet = useServerFn(getLikers);
  const callReveal = useServerFn(revealLikers);
  const [data, setData] = useState<LikersResult | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setData(await callGet());
    } catch {
      /* no-op */
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data || data.count === 0) return null;

  const reveal = async () => {
    setBusy(true);
    haptic("medium");
    try {
      const res = await callReveal();
      if (res.ok) {
        haptic("success");
        await load();
      } else {
        toast(t("perks.notEnough"));
      }
    } finally {
      setBusy(false);
    }
  };

  const likeBack = async (id: string) => {
    if (!profile) return;
    haptic("medium");
    await supabase.from("swipes").insert({ swiper_id: profile.id, target_id: id, action: "like" });
    haptic("success");
    toast.success(t("resonance.matchTitle"));
    await load();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-4 rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-3.5"
    >
      <div className="mb-2.5 flex items-center gap-2">
        <Heart className="h-4 w-4" style={{ color: "var(--like)" }} />
        <p className="text-sm font-semibold text-foreground">
          {t("likers.title", { count: data.count })}
        </p>
      </div>

      {!data.unlocked ? (
        <>
          <div className="flex gap-2">
            {Array.from({ length: Math.min(data.count, 5) }).map((_, i) => (
              <div
                key={i}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary"
              >
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
          <Button className="mt-3 w-full" size="sm" onClick={reveal} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {t("likers.reveal")} · {PERK_COSTS.reveal_likers}
              </>
            )}
          </Button>
        </>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {data.likers.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => likeBack(l.id)}
              className="shrink-0 text-center active:scale-95"
            >
              <div className="h-16 w-16 overflow-hidden rounded-full bg-secondary">
                {l.photo_url ? (
                  <img src={l.photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl">🌿</div>
                )}
              </div>
              <p className="mt-1 max-w-[4rem] truncate text-xs font-medium text-foreground">
                {l.display_name}
              </p>
              <p className="text-[10px] font-semibold text-primary">{t("likers.likeBack")}</p>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
