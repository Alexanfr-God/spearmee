import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "@/locales/en.json";
import ru from "@/locales/ru.json";
import ko from "@/locales/ko.json";

export const SUPPORTED_LANGS = ["en", "ru", "ko"] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

export function normalizeLang(code?: string | null): SupportedLang {
  if (!code) return "en";
  const base = code.toLowerCase().split("-")[0];
  return (SUPPORTED_LANGS as readonly string[]).includes(base)
    ? (base as SupportedLang)
    : "en";
}

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ru: { translation: ru },
      ko: { translation: ko },
    },
    lng: "en",
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function setLanguage(code?: string | null) {
  const lang = normalizeLang(code);
  if (i18n.language !== lang) i18n.changeLanguage(lang);
  return lang;
}

export default i18n;

export const LANG_LABELS: Record<SupportedLang, string> = {
  en: "English",
  ru: "Русский",
  ko: "한국어",
};