import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Sparkles, X, Heart } from "lucide-react";

import { getDailySet, type DailyCandidate } from "@/lib/daily.functions";
import { supabase } from "@/integrations/supabase/client";
import { signedUrls, logPremiumIntent } from "@/lib/helpers";
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
  const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
  const [match, setMatch] = useState<DailyCandidate | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["dailySet"],
    queryFn: () => callDailySet(),
  });

  const candidates = useMemo(() => data?.candidates ?? [], [data]);
  const current = candidates[index];

  useEffect(() => {
    const paths = candidates.map((c) => c.photo_path).filter(Boolean) as string[];
    if (paths.length) signedUrls(paths).then(setPhotoMap);
  }, [candidates]);

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
          <ResonanceCard candidate={current} photoUrl={current.photo_path ? photoMap[current.photo_path] : undefined} />
          <div className="mt-5 flex items-center justify-center gap-4">
            <ActionButton onClick={() => act("pass")} variant="pass" aria-label={t("resonance.pass")}>
              <X className="h-7 w-7" />
            </ActionButton>
            <ActionButton onClick={() => act("superlike")} variant="superlike" aria-label={t("resonance.spark")}>
              <Sparkles className="h-6 w-6" />
            </ActionButton>
            <ActionButton onClick={() => act("like")} variant="like" aria-label={t("resonance.resonate")}>
              <Heart className="h-7 w-7" />
            </ActionButton>
          </div>
        </>
      )}

      {match && (
        <MatchModal
          candidate={match}
          photoUrl={match.photo_path ? photoMap[match.photo_path] : undefined}
          onClose={() => setMatch(null)}
          onSayHello={() => {
            setMatch(null);
            nav.setTab("matches");
          }}
        />
      )}
      {isFetching && !isLoading && null}
      <button hidden onClick={() => refetch()} />
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center py-20 text-center">{children}</div>;
}

function ActionButton({
  children,
  onClick,
  variant,
  ...rest
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "pass" | "like" | "superlike";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const color =
    variant === "pass"
      ? "var(--pass)"
      : variant === "like"
        ? "var(--like)"
        : "var(--superlike)";
  const big = variant !== "superlike";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center rounded-full bg-card text-white shadow-[var(--shadow-soft)] active:scale-95"
      style={{
        backgroundColor: color,
        width: big ? 64 : 56,
        height: big ? 64 : 56,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}