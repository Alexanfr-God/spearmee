import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, Check, Flame, Sparkles, Rocket, Gem } from "lucide-react";

import {
  getQuests,
  claimQuest,
  buyBoost,
  buyMultiplier,
  type QuestState,
  type PointsState,
} from "@/lib/points.functions";
import { getMorePicks } from "@/lib/daily.functions";
import { PERK_COSTS, MULTIPLIER_TIERS } from "@/lib/perks";
import { useNav } from "@/components/nav";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const daysLeft = (until: string) =>
  Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 86400000));

const PERK_LIST = [
  { key: "extra_picks", cost: PERK_COSTS.extra_picks, icon: Sparkles },
  { key: "boost", cost: PERK_COSTS.boost, icon: Rocket },
] as const;

export function RewardsScreen() {
  const { t } = useTranslation();
  const nav = useNav();
  const callGet = useServerFn(getQuests);
  const callClaim = useServerFn(claimQuest);
  const callBoost = useServerFn(buyBoost);
  const callMore = useServerFn(getMorePicks);
  const callBuyMult = useServerFn(buyMultiplier);
  const [quests, setQuests] = useState<QuestState[]>([]);
  const [state, setState] = useState<PointsState | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await callGet();
      setQuests(res.quests);
      setState(res.state);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const claim = async (key: string) => {
    setClaiming(key);
    haptic("medium");
    try {
      const res = await callClaim({ data: { key } });
      if (res.ok) {
        haptic("success");
        toast.success(t("points.earnedToast", { points: res.awarded }));
      }
      await load();
    } finally {
      setClaiming(null);
    }
  };

  const redeem = async (key: string) => {
    if (!state || state.total < (key === "boost" ? PERK_COSTS.boost : PERK_COSTS.extra_picks)) {
      toast(t("perks.notEnough"));
      return;
    }
    setRedeeming(key);
    haptic("medium");
    try {
      if (key === "extra_picks") {
        const res = await callMore();
        if (res.ok) {
          haptic("success");
          toast.success(t("perks.extraPicksDone", { count: res.added }));
          await load();
          nav.setTab("discover");
          return;
        }
        toast(t(res.reason === "no_more" ? "perks.noMore" : "perks.notEnough"));
      } else if (key === "boost") {
        const res = await callBoost();
        if (res.ok) {
          haptic("success");
          toast.success(t("perks.boostDone"));
        } else {
          toast(t("perks.notEnough"));
        }
      }
      await load();
    } finally {
      setRedeeming(null);
    }
  };

  const buyMult = async (value: number) => {
    const tier = MULTIPLIER_TIERS.find((tr) => tr.value === value);
    if (!state || !tier || state.total < tier.cost) {
      toast(t("perks.notEnough"));
      return;
    }
    setRedeeming(`mult-${value}`);
    haptic("medium");
    try {
      const res = await callBuyMult({ data: { value } });
      if (res.ok) {
        haptic("success");
        toast.success(t("rewards.multiplierOn", { value }));
      } else {
        toast(t("perks.notEnough"));
      }
      await load();
    } finally {
      setRedeeming(null);
    }
  };

  if (loading || !state) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  const nextThreshold = LEVEL_THRESHOLDS[state.level + 1] ?? null;
  const prevThreshold = LEVEL_THRESHOLDS[state.level] ?? 0;
  const levelPct = nextThreshold
    ? Math.min(
        100,
        Math.round(((state.total - prevThreshold) / (nextThreshold - prevThreshold)) * 100),
      )
    : 100;

  const groups: { type: QuestState["type"]; label: string }[] = [
    { type: "daily", label: t("rewards.daily") },
    { type: "weekly", label: t("rewards.weekly") },
    { type: "once", label: t("rewards.oneTime") },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="flex flex-col gap-5 px-4 py-5"
    >
      <motion.header variants={item}>
        <h1 className="text-2xl font-bold text-foreground">{t("rewards.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("rewards.subtitle")}</p>
      </motion.header>

      {/* hero: RP + level + streak */}
      <motion.div
        variants={item}
        className="rounded-2xl border border-border bg-gradient-to-br from-primary/12 via-card to-card p-5"
      >
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold tabular-nums text-foreground">{state.total}</p>
            <p className="text-xs font-medium text-muted-foreground">{t("rewards.points")}</p>
          </div>
          {state.streak > 1 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: "color-mix(in oklab, var(--gold) 16%, transparent)",
                color: "var(--gold-foreground)",
              }}
            >
              <Flame className="h-3.5 w-3.5" style={{ color: "var(--gold)" }} />
              {t("points.streak", { count: state.streak })}
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{t(`points.levels.${state.level}`)}</span>
          {nextThreshold && (
            <span className="tabular-nums">
              {state.total}/{nextThreshold}
            </span>
          )}
        </div>
        <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${levelPct}%` }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.div>

      {/* perks — spend RP */}
      <motion.div variants={item} className="space-y-2">
        <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("rewards.perks")}
        </p>
        {PERK_LIST.map((p) => {
          const Icon = p.icon;
          const affordable = state.total >= p.cost;
          return (
            <div
              key={p.key}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)" }}
              >
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{t(`perks.${p.key}.title`)}</p>
                <p className="text-xs text-muted-foreground">{t(`perks.${p.key}.desc`)}</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.94 }}
                disabled={!affordable || redeeming === p.key}
                onClick={() => redeem(p.key)}
                className={cn(
                  "inline-flex min-w-[3.75rem] items-center justify-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                  affordable
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground",
                )}
              >
                {redeeming === p.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Gem className="h-3 w-3" />
                    {p.cost}
                  </>
                )}
              </motion.button>
            </div>
          );
        })}
      </motion.div>

      {/* earn multiplier */}
      <motion.div variants={item} className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("rewards.multiplier")}
          </p>
          {state.multiplier && state.multiplier > 1 && state.multiplierUntil && (
            <span className="text-[11px] font-semibold text-primary">
              ×{state.multiplier} ·{" "}
              {t("rewards.multiplierLeft", { days: daysLeft(state.multiplierUntil) })}
            </span>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {MULTIPLIER_TIERS.map((tier) => {
            const affordable = state.total >= tier.cost;
            const active =
              state.multiplier === tier.value &&
              !!state.multiplierUntil &&
              new Date(state.multiplierUntil).getTime() > Date.now();
            return (
              <motion.button
                key={tier.value}
                whileTap={{ scale: 0.96 }}
                disabled={!affordable || redeeming === `mult-${tier.value}`}
                onClick={() => buyMult(tier.value)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-2xl border p-3 text-center transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : affordable
                      ? "border-border bg-card"
                      : "border-border bg-card opacity-60",
                )}
              >
                <span className="text-base font-bold text-foreground">×{tier.value}</span>
                <span className="text-[11px] text-muted-foreground">
                  {tier.days}
                  {t("rewards.daysShort")}
                </span>
                <span className="mt-1 inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary">
                  <Gem className="h-3 w-3" />
                  {tier.cost}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {groups.map((g) => {
        const items = quests.filter((q) => q.type === g.type);
        if (!items.length) return null;
        return (
          <motion.div variants={item} key={g.type} className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {g.label}
            </p>
            {items.map((q) => (
              <div
                key={q.key}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t(`quests.${q.key}`)}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {q.progress}/{q.goal}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {q.claimed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Check className="h-4 w-4" />
                      {t("rewards.claimed")}
                    </span>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      disabled={!q.claimable || claiming === q.key}
                      onClick={() => claim(q.key)}
                      className={cn(
                        "inline-flex min-w-[3rem] items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold",
                        q.claimable
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      {claiming === q.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        `+${q.points}`
                      )}
                    </motion.button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
