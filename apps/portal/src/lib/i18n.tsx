import { i18n } from "@lingui/core";

export type SupportedLocale = "en" | "es" | "fr" | "ar" | "zh" | "hi";

export const localeNames: Record<SupportedLocale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  ar: "العربية",
  zh: "中文",
  hi: "हिन्दी",
};

export const rtlLocales: SupportedLocale[] = ["ar"];

export const isRtl = (locale: SupportedLocale): boolean =>
  rtlLocales.includes(locale);

const STORAGE_KEY = "locale";

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

export async function loadCatalog(locale: SupportedLocale): Promise<void> {
  const { messages } = await import(`../locales/${locale}.po`);
  i18n.loadAndActivate({ locale, messages });
  document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
}

export { i18n };
