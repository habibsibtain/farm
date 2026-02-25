import React, { createContext, useContext, useState, ReactNode } from "react";
import { Language } from "../types";

interface LanguageContextValue {
  language: Language;
  cycleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);

  const cycleLanguage = () => {
    // Same simple cycle logic that previously lived in App.tsx
    const langs = [
      Language.ENGLISH,
      Language.HINDI,
      Language.PUNJABI,
      Language.TELUGU,
    ];
    const currentIndex = langs.indexOf(language);
    const nextIndex = (currentIndex + 1) % langs.length;
    setLanguage(langs[nextIndex]);
  };

  return (
    <LanguageContext.Provider value={{ language, cycleLanguage }}>
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

