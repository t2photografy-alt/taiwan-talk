import type { LanguageDirection, Phrase } from './types';

export function getPhraseDirection(phrase: Pick<Phrase, 'sourceLanguage' | 'targetLanguage'>): LanguageDirection {
  return phrase.sourceLanguage === 'zh-TW' && phrase.targetLanguage === 'ja'
    ? 'zh-TW-to-ja'
    : 'ja-to-zh-TW';
}

export function getMandarinText(phrase: Pick<Phrase, 'sourceLanguage' | 'targetLanguage' | 'sourceText' | 'resultText'>) {
  if (phrase.sourceLanguage === 'zh-TW') {
    return phrase.sourceText;
  }

  if (phrase.targetLanguage === 'zh-TW') {
    return phrase.resultText;
  }

  return phrase.resultText;
}

export function getDisplayMainText(phrase: Pick<Phrase, 'resultText'>) {
  return phrase.resultText;
}

export function getDisplaySupportText(phrase: Pick<Phrase, 'sourceText'>) {
  return phrase.sourceText;
}

export function toDirectionPhrase(phrase: Phrase, direction: LanguageDirection): Phrase {
  if (getPhraseDirection(phrase) === direction) {
    return phrase;
  }

  return {
    ...phrase,
    sourceText: phrase.resultText,
    resultText: phrase.sourceText,
    sourceLanguage: phrase.targetLanguage,
    targetLanguage: phrase.sourceLanguage,
  };
}
