import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CRM_EN } from "../i18n/crm-en";
import { PUBLIC_EN } from "../i18n/public-en";
import { LANDING_EN } from "../i18n/landing-en";
import { RESOURCE_EN } from "../i18n/resources-en";
import { CRM_EXTRA_EN } from "../i18n/crm-extra-en";
import { RESOURCE_EXTRA_EN } from "../i18n/resources-extra-en";
export type Language = "es" | "en";
export type Translator = (
  source: string,
  values?: Record<string, string | number>
) => string;
let currentLanguage: Language = "es";
export function translate(
  source: string,
  values?: Record<string, string | number>,
  language = currentLanguage
): string {
  let result =
    language === "en"
      ? (CRM_EN[source] ??
        CRM_EXTRA_EN[source] ??
        LANDING_EN[source] ??
        RESOURCE_EXTRA_EN[source] ??
        RESOURCE_EN[source] ??
        PUBLIC_EN[source] ??
        source)
      : source;
  for (const [key, value] of Object.entries(values ?? {}))
    result = result.replaceAll(`{${key}}`, String(value));
  return result;
}
const defaults = {
  language: "es" as Language,
  setLanguage: (_value: Language) => {},
  t: ((source: string, values?: Record<string, string | number>) =>
    translate(source, values, "es")) as Translator,
};
const Context = createContext(defaults);
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === "undefined") return "es";
    try {
      return localStorage.getItem("etc-language") === "en" ? "en" : "es";
    } catch {
      return "es";
    }
  });
  currentLanguage = language;
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem("etc-language", language);
    } catch {
      /* Preference remains in memory. */
    }
  }, [language]);
  const t = useCallback<Translator>(
    (source, values) => translate(source, values, language),
    [language]
  );
  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useI18n = () => useContext(Context);
