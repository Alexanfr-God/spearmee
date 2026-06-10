import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import {
  awardPoints,
  registerDailyVisit,
  type PointsAction,
  type PointsState,
} from "@/lib/points.functions";
import { haptic } from "@/lib/telegram";

interface PointsContextValue {
  state: PointsState;
  award: (action: PointsAction) => Promise<void>;
}

const DEFAULT_STATE: PointsState = { total: 0, awarded: 0, level: 0, streak: 0 };

const PointsContext = createContext<PointsContextValue | null>(null);

export function PointsProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const callDailyVisit = useServerFn(registerDailyVisit);
  const callAward = useServerFn(awardPoints);
  const [state, setState] = useState<PointsState>(DEFAULT_STATE);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.id || startedFor.current === profile.id) return;
    startedFor.current = profile.id;
    (async () => {
      try {
        const next = await callDailyVisit({ data: undefined as never });
        setState(next);
        if (next.streak > 1) {
          toast(t("points.streakToast", { count: next.streak }));
        }
      } catch (e) {
        console.error("[points] daily visit failed", e);
      }
    })();
  }, [profile?.id, callDailyVisit, t]);

  const award = useCallback(
    async (action: PointsAction) => {
      try {
        const next = await callAward({ data: { action } });
        setState((prev) => ({ ...next, awarded: next.awarded }));
        if (next.awarded > 0) {
          haptic("medium");
          toast.success(t("points.earnedToast", { points: next.awarded }));
        }
      } catch (e) {
        console.error("[points] award failed", e);
      }
    },
    [callAward, t],
  );

  return (
    <PointsContext.Provider value={{ state, award }}>
      {children}
    </PointsContext.Provider>
  );
}

export function usePoints() {
  const ctx = useContext(PointsContext);
  if (!ctx) throw new Error("usePoints must be used within PointsProvider");
  return ctx;
}
