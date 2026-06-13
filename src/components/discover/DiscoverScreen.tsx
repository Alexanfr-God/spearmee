import { useMemo, useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Heart } from "lucide-react";

import { getDailySet, type DailyCandidate } from "@/lib/daily.functions";
import { supabase } from "@/integrations/supabase/client";
import { logPremiumIntent } from "@/lib/helpers";
import { useAuth } from "@/hooks/useAuth";
import { useNav } from "@/components/nav";
import { usePoints } from "@/hooks/usePoints";
import { PointsPill } from "@/components/points/PointsPill";
import { haptic } from "@/lib/telegram";
import { ResonanceCard } from "@/components/discover/ResonanceCard";
import { MatchModal } from "@/components/discover/MatchModal";
import { Button } from "@/components/ui/button";

export function DiscoverScreen() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const nav = useNav();
  const { award } = usePoints();
  const callDailySet = useServerFn(getDailySet);
  const [index, setIndex] = useState(0);
  const [match, setMatch] = useState<DailyCandidate | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["dailySet"],
    queryFn: () => callDailySet(),
  });

  const candidates = useMemo(() => data?.candidates ?? [], [data]);
  const current = candidates[index];

  const act = async (action: "like" | "pass" | "superlike") => {
    if (!current || !profile) return;
    haptic(action === "pass" ? "light" : "medium");

    await supabase.from("swipes").insert({
      swiper_id: profile.id,
      target_id: current.id,
      action,
    });

    if (action === "superlike") {
      await logPremiumIntent(profile.id, "spark", { target_id: current.id });
      toast.success(t("resonance.sparkSent"));
    }

    if (action !== "pass") {
      const { data: m } = await supabase
        .from("matches")
        .select("id, user_a, user_b")
        .or(
          `and(user_a.eq.${profile.id},user_b.eq.${current.id}),and(user_a.eq.${current.id},user_b.eq.${profile.id})`,
        )
        .maybeSingle();
      if (m) {
        haptic("success");
        void award("got_match");
        setMatch(current);
        setIndex((i) => i + 1);
        return;
      }
    }
    setIndex((i) => i + 1);
  };

  if (isLoading) {
    return (
      <Centered>
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="mt-3 text-sm text-muted-foreground">{t("resonance.buildingSet")}</p>
      </Centered>
    );
  }

  const done = !current;

  return (
    <div className="px-4 pt-4">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("resonance.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("resonance.subtitle")}</p>
        </div>
        <PointsPill className="mt-1 shrink-0" />
      </header>

      {done ? (
        <Centered>
          <div className="text-4xl">✨</div>
          <p className="mt-3 text-sm text-muted-foreground">{t("resonance.empty")}</p>
          <Button
            variant="secondary"
            className="mt-5"
            onClick={async () => {
              if (profile) await logPremiumIntent(profile.id, "get_more_picks");
              toast(t("resonance.getMoreLogged"));
            }}
          >
            {t("resonance.getMore")}
          </Button>
        </Centered>
      ) : (
        <>
          <p className="mb-2 text-center text-xs font-medium text-muted-foreground">
            {t("resonance.progress", { current: index + 1, total: candidates.length })}
          </p>

          <div className="relative">
            <AnimatePresence mode="popLayout">
              <SwipeCard
                key={current.id}
                candidate={current}
                photoUrl={current.photo_url ?? undefined}
                onDecide={(a) => void act(a)}
              />
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            <ActionButton
              onClick={() => void act("pass")}
              variant="pass"
              ariaLabel={t("resonance.pass")}
            >
              <X className="h-7 w-7" />
            </ActionButton>
            <ActionButton
              onClick={() => void act("superlike")}
              variant="superlike"
              ariaLabel={t("resonance.spark")}
            >
              <Sparkles className="h-6 w-6" />
            </ActionButton>
            <ActionButton
              onClick={() => void act("like")}
              variant="like"
              ariaLabel={t("resonance.resonate")}
            >
              <Heart className="h-7 w-7" />
            </ActionButton>
          </div>
        </>
      )}

      <AnimatePresence>
        {match && (
          <MatchModal
            key="match"
            candidate={match}
            photoUrl={match.photo_url ?? undefined}
            onClose={() => setMatch(null)}
            onSayHello={() => {
              setMatch(null);
              nav.setTab("matches");
            }}
          />
        )}
      </AnimatePresence>
      {isFetching && !isLoading && null}
      <button hidden onClick={() => refetch()} />
    </div>
  );
}

/** A single draggable Resonance card with swipe-to-decide physics. */
function SwipeCard({
  candidate,
  photoUrl,
  onDecide,
}: {
  candidate: DailyCandidate;
  photoUrl?: string;
  onDecide: (action: "like" | "pass") => void;
}) {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-14, 14]);
  const likeOpacity = useTransform(x, [30, 130], [0, 1]);
  const nopeOpacity = useTransform(x, [-30, -130], [0, 1]);
  const [exitX, setExitX] = useState(0);

  return (
    <motion.div
      style={{ x, rotate }}
      drag="x"
      dragSnapToOrigin
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.55}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120 || info.velocity.x > 700) {
          setExitX(460);
          onDecide("like");
        } else if (info.offset.x < -120 || info.velocity.x < -700) {
          setExitX(-460);
          onDecide("pass");
        }
      }}
      initial={{ scale: 0.95, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{
        x: exitX,
        opacity: 0,
        scale: exitX === 0 ? 0.95 : 1,
        rotate: exitX > 0 ? 18 : exitX < 0 ? -18 : 0,
        transition: { duration: 0.28 },
      }}
      whileTap={{ scale: 0.99 }}
      className="relative will-change-transform"
    >
      <motion.div
        aria-hidden
        style={{ opacity: likeOpacity, color: "var(--like)", borderColor: "var(--like)" }}
        className="pointer-events-none absolute left-5 top-6 z-10 -rotate-12 rounded-xl border-[3px] px-3 py-1 text-2xl font-extrabold uppercase tracking-wider"
      >
        {t("resonance.resonate")}
      </motion.div>
      <motion.div
        aria-hidden
        style={{
          opacity: nopeOpacity,
          color: "var(--destructive)",
          borderColor: "var(--destructive)",
        }}
        className="pointer-events-none absolute right-5 top-6 z-10 rotate-12 rounded-xl border-[3px] px-3 py-1 text-2xl font-extrabold uppercase tracking-wider"
      >
        {t("resonance.pass")}
      </motion.div>
      <ResonanceCard candidate={candidate} photoUrl={photoUrl} />
    </motion.div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">{children}</div>
  );
}

function ActionButton({
  children,
  onClick,
  variant,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "pass" | "like" | "superlike";
  ariaLabel?: string;
}) {
  const color =
    variant === "pass" ? "var(--pass)" : variant === "like" ? "var(--like)" : "var(--superlike)";
  const big = variant !== "superlike";
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      whileTap={{ scale: 0.86 }}
      className="flex items-center justify-center rounded-full text-white shadow-[var(--shadow-soft)]"
      style={{ backgroundColor: color, width: big ? 64 : 56, height: big ? 64 : 56 }}
    >
      {children}
    </motion.button>
  );
}
