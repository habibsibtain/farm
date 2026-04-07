import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import { Language } from "../types";
import { i18n, SUPPORTED_LANGUAGES } from "../i18n";

interface LanguageContextValue {
  language: Language;
  t: (key: string, params?: Record<string, unknown>) => string;
  changeLanguage: (nextLanguage: string) => Promise<void>;
  cycleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

const LANGUAGE_KEY = "kisan_selected_language";
const SUPPORTED_CODES = new Set<string>(SUPPORTED_LANGUAGES.map((l) => l.code));

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);

  useEffect(() => {
    const bootstrapLanguage = async () => {
      try {
        const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (stored && SUPPORTED_CODES.has(stored)) {
          setLanguage(stored as Language);
          i18n.locale = stored;
          return;
        }
      } catch {
        // no-op
      }

      const locale = Localization.getLocales()[0]?.languageCode || "en";
      const fallback = SUPPORTED_CODES.has(locale) ? locale : "en";
      setLanguage(fallback as Language);
      i18n.locale = fallback;
    };
    void bootstrapLanguage();
  }, []);

  const changeLanguage = async (nextLanguage: string) => {
    const normalized = SUPPORTED_CODES.has(nextLanguage) ? nextLanguage : "en";
    setLanguage(normalized as Language);
    i18n.locale = normalized;
    await AsyncStorage.setItem(LANGUAGE_KEY, normalized);
  };

  const cycleLanguage = () => {
    const langs = SUPPORTED_LANGUAGES.map((l) => l.code);
    const currentIndex = langs.indexOf(language);
    const nextIndex = (currentIndex + 1) % langs.length;
    void changeLanguage(langs[nextIndex]);
  };

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      t: (key, params) => i18n.t(key, params),
      changeLanguage,
      cycleLanguage,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return ctx;
};

