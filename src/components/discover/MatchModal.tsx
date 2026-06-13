import { motion } from "motion/react";
import { useTranslation } from "react-i18next";

import type { DailyCandidate } from "@/lib/daily.functions";
import { Button } from "@/components/ui/button";

const SPARKS = [
  { left: "8%", delay: 0, dur: 2.6, size: 20, char: "❤️" },
  { left: "22%", delay: 0.4, dur: 3.0, size: 14, char: "✨" },
  { left: "38%", delay: 0.9, dur: 2.4, size: 18, char: "💫" },
  { left: "55%", delay: 0.2, dur: 2.9, size: 16, char: "❤️" },
  { left: "70%", delay: 0.7, dur: 2.5, size: 22, char: "✨" },
  { left: "85%", delay: 1.1, dur: 3.1, size: 14, char: "💖" },
  { left: "47%", delay: 1.4, dur: 2.7, size: 16, char: "✨" },
];

export function MatchModal({
  candidate,
  photoUrl,
  onClose,
  onSayHello,
}: {
  candidate: DailyCandidate;
  photoUrl?: string;
  onClose: () => void;
  onSayHello: () => void;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background:
          "radial-gradient(120% 80% at 50% 0%, color-mix(in oklab, var(--primary) 45%, transparent), oklch(0.12 0.02 262 / 0.82))",
      }}
    >
      {/* rising sparks / hearts */}
      {SPARKS.map((p, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute bottom-0 select-none"
          style={{ left: p.left, fontSize: p.size }}
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: -560, opacity: [0, 1, 1, 0] }}
          transition={{ delay: p.delay, duration: p.dur, repeat: Infinity, ease: "easeOut" }}
        >
          {p.char}
        </motion.span>
      ))}

      <motion.div
        className="relative w-full max-w-[340px] overflow-hidden rounded-[28px] bg-card p-7 text-center shadow-[var(--shadow-card)]"
        initial={{ scale: 0.82, y: 26, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
      >
        {/* avatar with rotating gradient ring */}
        <div className="relative mx-auto h-28 w-28">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, var(--primary), var(--coral), var(--gold), var(--primary))",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          />
          <div className="absolute inset-[3px] rounded-full bg-card" />
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={candidate.display_name ?? ""}
              className="absolute inset-[6px] rounded-full object-cover"
            />
          ) : (
            <div className="absolute inset-[6px] flex items-center justify-center rounded-full bg-secondary text-4xl">
              🌿
            </div>
          )}
        </div>

        <motion.h2
          className="mt-5 text-2xl font-bold text-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {t("resonance.matchTitle")}
        </motion.h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("resonance.matchBody", { name: candidate.display_name })}
        </p>

        <div className="mt-6 space-y-2">
          <Button className="w-full" size="lg" onClick={onSayHello}>
            {t("resonance.sayHello")}
          </Button>
          <Button className="w-full" variant="ghost" onClick={onClose}>
            {t("resonance.keepGoing")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
