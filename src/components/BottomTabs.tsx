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
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[420px] border-t border-border bg-card/95 backdrop-blur">
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
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </nav>
  );
}