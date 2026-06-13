import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";

import { useAuth } from "@/hooks/useAuth";
import { NavProvider, useNav } from "@/components/nav";
import { PointsProvider } from "@/hooks/usePoints";
import appBg from "@/assets/app-bg.png.asset.json";
import { isProfileComplete } from "@/lib/profile-complete";
import { RegistrationWizard } from "@/components/onboarding/RegistrationWizard";
import { BottomTabs } from "@/components/BottomTabs";
import { DiscoverScreen } from "@/components/discover/DiscoverScreen";
import { MatchesScreen } from "@/components/matches/MatchesScreen";
import { ChatScreen } from "@/components/matches/ChatScreen";
import { BlogScreen } from "@/components/blog/BlogScreen";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { PreferencesScreen } from "@/components/profile/PreferencesScreen";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}

function Splash() {
  const { t } = useTranslation();
  return (
    <Centered>
      <div className="text-4xl font-extrabold tracking-tight text-primary">
        {t("common.appName")}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{t("auth.signingIn")}</p>
      <div className="mt-6 h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </div>
    </Centered>
  );
}

function AuthError() {
  const { t } = useTranslation();
  return (
    <Centered>
      <div className="text-2xl font-bold text-foreground">{t("common.appName")}</div>
      <p className="mt-3 text-sm text-muted-foreground">{t("auth.error")}</p>
    </Centered>
  );
}

function MainApp() {
  const nav = useNav();

  if (nav.chatMatchId) {
    return <ChatScreen matchId={nav.chatMatchId} onBack={nav.closeChat} />;
  }
  if (nav.editingProfile) {
    return <RegistrationWizard mode="edit" onDone={nav.closeOverlay} />;
  }
  if (nav.showPrefs) {
    return <PreferencesScreen onBack={nav.closeOverlay} />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[420px] flex-col">
      <div className="flex-1 pb-20">
        {nav.tab === "discover" && <DiscoverScreen />}
        {nav.tab === "matches" && <MatchesScreen />}
        {nav.tab === "blog" && <BlogScreen />}
        {nav.tab === "profile" && <ProfileScreen />}
      </div>
      <BottomTabs />
    </div>
  );
}

function Inner() {
  const { status, profile } = useAuth();

  if (status === "loading") return <Splash />;
  if (status === "error" || !profile) return <AuthError />;

  // Force onboarding until the profile reaches the minimum bar.
  if (!profile.onboarded && !isProfileComplete(profile)) {
    return <RegistrationWizard mode="onboarding" />;
  }

  return <MainApp />;
}

export function AppShell() {
  return (
    <NavProvider>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-background bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${appBg.url})` }}
      />
      <PointsProvider>
        <Inner />
      </PointsProvider>
      <Toaster position="top-center" />
    </NavProvider>
  );
}