import { i18n } from "@lingui/core";

import { messages as arMessages } from "../locales/ar.po";
import { messages as enMessages } from "../locales/en.po";
import { messages as esMessages } from "../locales/es.po";
import { messages as frMessages } from "../locales/fr.po";
import { messages as hiMessages } from "../locales/hi.po";
import { messages as jaMessages } from "../locales/ja.po";
import { messages as zhMessages } from "../locales/zh.po";

export type SupportedLocale = "en" | "es" | "fr" | "ar" | "zh" | "hi" | "ja";

export const localeNames: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  ar: "العربية",
  zh: "中文",
  hi: "हिन्दी",
  ja: "日本語",
};

export const rtlLocales: SupportedLocale[] = ["ar"];

export const isRtl = (locale: SupportedLocale): boolean =>
  rtlLocales.includes(locale);

const STORAGE_KEY = "locale";

const catalogs: Record<SupportedLocale, Record<string, string>> = {
  en: enMessages as Record<string, string>,
  es: esMessages as Record<string, string>,
  fr: frMessages as Record<string, string>,
  ar: arMessages as Record<string, string>,
  zh: zhMessages as Record<string, string>,
  hi: hiMessages as Record<string, string>,
  ja: jaMessages as Record<string, string>,
};

export const getStoredLocale = (): SupportedLocale => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in localeNames) return stored as SupportedLocale;
  } catch {
    // ignore
  }
  return "en";
};

export const storeLocale = (locale: SupportedLocale): void => {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // ignore
  }
};

export function loadCatalog(locale: SupportedLocale): void {
  i18n.loadAndActivate({ locale, messages: catalogs[locale] });
  document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
}

// Initialize immediately with stored locale
loadCatalog(getStoredLocale());

export { i18n };
