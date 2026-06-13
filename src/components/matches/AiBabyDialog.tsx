import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Loader2, X, Sparkles } from "lucide-react";

import { generateAiBaby, type AiBabyReason } from "@/lib/ai-baby.functions";
import { Button } from "@/components/ui/button";

const ERROR_KEY: Record<AiBabyReason, string> = {
  need_photos: "aiBaby.needPhotos",
  rate_limit: "aiBaby.rateLimit",
  no_credits: "aiBaby.noCredits",
  unavailable: "aiBaby.unavailable",
  error: "aiBaby.error",
};

export function AiBabyDialog({ matchId, onClose }: { matchId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const callBaby = useServerFn(generateAiBaby);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<AiBabyReason | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await callBaby({ data: { match_id: matchId } });
      if (res.ok) setImageUrl(res.image_url);
      else setError(res.reason);
    } catch {
      setError("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="w-full max-w-[340px] rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)]"
        initial={{ scale: 0.85, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("aiBaby.title")}</h2>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-secondary">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="load"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </motion.div>
            ) : imageUrl ? (
              <motion.img
                key="img"
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
                initial={{ opacity: 0, scale: 1.12, filter: "blur(14px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : (
              <motion.span
                key="placeholder"
                className="text-6xl"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                👶
              </motion.span>
            )}
          </AnimatePresence>
          {imageUrl && !loading && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute right-2 top-2"
              initial={{ scale: 0, rotate: -30, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 16 }}
            >
              <Sparkles className="h-6 w-6" style={{ color: "var(--gold)" }} />
            </motion.div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{t(ERROR_KEY[error])}</p>}
        <p className="mt-3 text-xs text-muted-foreground">{t("aiBaby.disclaimer")}</p>
        <Button className="mt-4 w-full" onClick={generate} disabled={loading}>
          {loading ? t("aiBaby.generating") : imageUrl ? t("aiBaby.again") : t("aiBaby.generate")}
        </Button>
      </motion.div>
    </motion.div>
  );
}
