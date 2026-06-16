"use client";

import { createContext, useContext } from "react";
import { translations, type TranslationKey, type Translations } from "./translations";
export { getT } from "./translations";
import type { Language } from "@/types";

const LanguageContext = createContext<Translations>(translations.en);

export function LanguageProvider({
  language,
  children,
}: {
  language: Language;
  children: React.ReactNode;
}) {
  const dict = translations[language] ?? translations.en;
  return <LanguageContext.Provider value={dict}>{children}</LanguageContext.Provider>;
}

export function useT() {
  const dict = useContext(LanguageContext);
  return (key: TranslationKey) => dict[key];
}

