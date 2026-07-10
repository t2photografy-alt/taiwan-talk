import type { LanguageCode, Tone } from './types';

export function normalizeNuance(
  value: unknown,
  tone: Tone,
  targetLanguage: LanguageCode,
  comparisonTexts?: Array<string | undefined>,
): string;
