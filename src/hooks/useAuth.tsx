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

import { supabase } from "@/integrations/supabase/client";
import { tgAuth } from "@/lib/auth.functions";
import {
  applyTelegramTheme,
  getTelegramUser,
  initWebApp,
  isTelegramEnv,
} from "@/lib/telegram";
import { setLanguage } from "@/lib/i18n";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthStatus = "loading" | "ready" | "error";

interface AuthContextValue {
  status: AuthStatus;
  profile: Profile | null;
  telegramPhotoUrl: string | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_KEY = "spearmee_demo_id";

function getDemoId(): number {
  if (typeof localStorage === "undefined") return 100000000;
  let id = localStorage.getItem(DEMO_KEY);
  if (!id) {
    id = String(900000000 + Math.floor(Math.random() * 90000000));
    localStorage.setItem(DEMO_KEY, id);
  }
  return Number(id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const callTgAuth = useServerFn(tgAuth);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [telegramPhotoUrl, setTelegramPhotoUrl] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const started = useRef(false);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (data) {
      setProfile(data);
      setLanguage(data.language_code);
    }
    return data ?? null;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (userIdRef.current) await loadProfile(userIdRef.current);
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    userIdRef.current = null;
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        initWebApp();
        applyTelegramTheme();

        const tgUser = getTelegramUser();
        if (tgUser?.photo_url) setTelegramPhotoUrl(tgUser.photo_url);
        if (tgUser?.language_code) setLanguage(tgUser.language_code);

        const inTelegram = isTelegramEnv();
        const initData = inTelegram
          ? (window.Telegram?.WebApp?.initData ?? "")
          : "";

        const payload = inTelegram
          ? { data: { initData } }
          : { data: { demo: { id: getDemoId(), first_name: "Demo" } } };

        const result = await callTgAuth(payload);

        const { error } = await supabase.auth.signInWithPassword({
          email: result.email,
          password: result.password,
        });
        if (error) throw error;

        const { data: sessionData } = await supabase.auth.getUser();
        const uid = sessionData.user?.id;
        if (!uid) throw new Error("No session user");
        userIdRef.current = uid;
        await loadProfile(uid);
        setStatus("ready");
      } catch (e) {
        console.error("[auth] failed", e);
        setStatus("error");
      }
    })();
  }, [callTgAuth, loadProfile]);

  return (
    <AuthContext.Provider
      value={{ status, profile, telegramPhotoUrl, refreshProfile, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}