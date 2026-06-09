import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Tab = "discover" | "matches" | "blog" | "profile";

interface NavState {
  tab: Tab;
  chatMatchId: string | null;
  editingProfile: boolean;
  showPrefs: boolean;
}

interface NavContextValue extends NavState {
  setTab: (t: Tab) => void;
  openChat: (matchId: string) => void;
  closeChat: () => void;
  openEditProfile: () => void;
  openPreferences: () => void;
  closeOverlay: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavState>({
    tab: "discover",
    chatMatchId: null,
    editingProfile: false,
    showPrefs: false,
  });

  const value = useMemo<NavContextValue>(
    () => ({
      ...state,
      setTab: (tab) =>
        setState({ tab, chatMatchId: null, editingProfile: false, showPrefs: false }),
      openChat: (chatMatchId) => setState((s) => ({ ...s, chatMatchId })),
      closeChat: () => setState((s) => ({ ...s, chatMatchId: null })),
      openEditProfile: () => setState((s) => ({ ...s, editingProfile: true })),
      openPreferences: () => setState((s) => ({ ...s, showPrefs: true })),
      closeOverlay: () =>
        setState((s) => ({ ...s, editingProfile: false, showPrefs: false })),
    }),
    [state],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav() {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
}