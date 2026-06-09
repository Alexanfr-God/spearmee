// Telegram WebApp SDK helpers.
// The SDK is loaded via a <script> tag in __root.tsx; here we provide typed access.

export interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  destructive_text_color?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    isVisible: boolean;
    setText: (t: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function isTelegramEnv(): boolean {
  const wa = getWebApp();
  return !!wa && !!wa.initData && wa.initData.length > 0;
}

/** Initialize the WebApp: ready + expand. Safe to call once on startup. */
export function initWebApp(): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    wa.ready();
    wa.expand();
  } catch {
    /* no-op */
  }
}

/** Map Telegram theme params onto our CSS design tokens. */
export function applyTelegramTheme(): void {
  const wa = getWebApp();
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!wa) return;

  const tp = wa.themeParams ?? {};
  const set = (token: string, value?: string) => {
    if (value) root.style.setProperty(token, value);
  };

  if (wa.colorScheme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");

  set("--background", tp.bg_color);
  set("--foreground", tp.text_color);
  set("--card", tp.section_bg_color ?? tp.bg_color);
  set("--card-foreground", tp.text_color);
  set("--popover", tp.secondary_bg_color ?? tp.bg_color);
  set("--popover-foreground", tp.text_color);
  set("--muted", tp.secondary_bg_color);
  set("--muted-foreground", tp.hint_color);
  set("--secondary", tp.secondary_bg_color);
  set("--secondary-foreground", tp.text_color);
  set("--border", tp.secondary_bg_color);
  set("--input", tp.secondary_bg_color);
  // Brand accent derives from Telegram's button color when available.
  set("--primary", tp.button_color);
  set("--primary-foreground", tp.button_text_color);
  set("--ring", tp.button_color);
  set("--accent", tp.secondary_bg_color);
  set("--accent-foreground", tp.text_color);
  set("--destructive", tp.destructive_text_color);
}

export function haptic(
  kind: "light" | "medium" | "heavy" | "success" | "error" | "warning" | "selection",
): void {
  const wa = getWebApp();
  if (!wa) return;
  try {
    if (kind === "success" || kind === "error" || kind === "warning") {
      wa.HapticFeedback.notificationOccurred(kind);
    } else if (kind === "selection") {
      wa.HapticFeedback.selectionChanged();
    } else {
      wa.HapticFeedback.impactOccurred(kind);
    }
  } catch {
    /* no-op */
  }
}

export function getTelegramUser(): TelegramUser | null {
  return getWebApp()?.initDataUnsafe?.user ?? null;
}