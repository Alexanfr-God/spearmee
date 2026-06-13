import { motion } from "motion/react";
import { Compass, Heart, BookOpen, User } from "lucide-react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useNav, type Tab } from "@/components/nav";

const TABS: { key: Tab; icon: typeof Compass; labelKey: string }[] = [
  { key: "discover", icon: Compass, labelKey: "tabs.discover" },
  { key: "matches", icon: Heart, labelKey: "tabs.matches" },
  { key: "blog", icon: BookOpen, labelKey: "tabs.blog" },
  { key: "profile", icon: User, labelKey: "tabs.profile" },
];

export function BottomTabs() {
  const { t } = useTranslation();
  const nav = useNav();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px] border-t border-border bg-card/80 backdrop-blur-xl">
      <div className="grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ key, icon: Icon, labelKey }) => {
          const active = nav.tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                haptic("selection");
                nav.setTab(key);
              }}
              className="relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium"
            >
              {active && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute -top-px h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <motion.span
                animate={{ scale: active ? 1.12 : 1, y: active ? -1 : 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 24 }}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </motion.span>
              <span
                className={cn(
                  "transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {t(labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
