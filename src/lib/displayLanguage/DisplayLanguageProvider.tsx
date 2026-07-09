import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import {
  displayLanguageLabels,
  readDisplayLanguage,
  translate,
  writeDisplayLanguage,
} from './displayLanguage';
import type { DisplayLanguage, TranslationKey } from './types';

type DisplayLanguageContextValue = {
  language: DisplayLanguage;
  setLanguage: (language: DisplayLanguage) => void;
  t: (key: TranslationKey) => string;
};

const DisplayLanguageContext = createContext<DisplayLanguageContextValue | null>(null);

export function DisplayLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<DisplayLanguage>(() => readDisplayLanguage());

  const value = useMemo<DisplayLanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage);
        writeDisplayLanguage(nextLanguage);
      },
      t: (key) => translate(language, key),
    }),
    [language],
  );

  return <DisplayLanguageContext.Provider value={value}>{children}</DisplayLanguageContext.Provider>;
}

export function useDisplayLanguage() {
  const context = useContext(DisplayLanguageContext);

  if (!context) {
    throw new Error('useDisplayLanguage must be used inside DisplayLanguageProvider');
  }

  return context;
}

export const displayLanguageOptions = [
  { language: 'ja' as const, label: displayLanguageLabels.ja },
  { language: 'zh-TW' as const, label: displayLanguageLabels['zh-TW'] },
];
