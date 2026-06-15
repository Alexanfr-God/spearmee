import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Sparkles, Languages, Baby, ShieldCheck, type LucideIcon } from "lucide-react";

import { LogoMark, Wordmark } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * First-run intro shown before the profile wizard. Sets the women-first,
 * family-minded positioning and the three differentiators (Resonance,
 * no language barrier, AI baby) before asking for anything.
 */
export function WelcomeStep({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();

  const pillars: { icon: LucideIcon; title: string; desc: string }[] = [
    {
      icon: Sparkles,
      title: t("onboarding.welcome.p1Title"),
      desc: t("onboarding.welcome.p1Desc"),
    },
    {
      icon: Languages,
      title: t("onboarding.welcome.p2Title"),
      desc: t("onboarding.welcome.p2Desc"),
    },
    { icon: Baby, title: t("onboarding.welcome.p3Title"), desc: t("onboarding.welcome.p3Desc") },
  ];

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-10">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col"
      >
        {/* Logo with a soft cosmic halo */}
        <motion.div variants={item} className="relative mb-6 flex flex-col items-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-6 h-40 w-40 rounded-full blur-3xl"
            style={{
              background: "radial-gradient(circle, rgba(91,140,255,0.35), transparent 70%)",
            }}
          />
          <LogoMark size={64} className="relative drop-shadow-[0_8px_24px_rgba(43,79,214,0.45)]" />
          <span className="relative mt-3 text-2xl">
            <Wordmark />
          </span>
        </motion.div>

        <motion.span
          variants={item}
          className="mx-auto rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
        >
          {t("onboarding.welcome.eyebrow")}
        </motion.span>

        <motion.h1
          variants={item}
          className="mt-4 text-center text-[1.75rem] font-bold leading-tight tracking-tight"
        >
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(120deg, #5b8cff, #2b4fd6)" }}
          >
            {t("onboarding.welcome.title")}
          </span>
        </motion.h1>

        <motion.p
          variants={item}
          className="mx-auto mt-3 max-w-[20rem] text-center text-sm leading-relaxed text-muted-foreground"
        >
          {t("onboarding.welcome.subtitle")}
        </motion.p>

        <div className="mt-7 space-y-3">
          {pillars.map(({ icon: Icon, title, desc }) => (
            <motion.div
              key={title}
              variants={item}
              className="flex items-start gap-3.5 rounded-2xl border border-border bg-card/70 p-3.5 backdrop-blur"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-foreground">{title}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          variants={item}
          className="mx-auto mt-6 flex max-w-[19rem] items-center justify-center gap-1.5 text-center text-[0.7rem] leading-snug text-muted-foreground"
        >
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" />
          {t("onboarding.welcome.trust")}
        </motion.p>
      </motion.div>

      <motion.div variants={item} initial="hidden" animate="show" className="mt-8">
        <Button className="w-full" size="lg" onClick={onStart}>
          {t("onboarding.welcome.cta")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("onboarding.welcome.free")}
        </p>
      </motion.div>
    </div>
  );
}
