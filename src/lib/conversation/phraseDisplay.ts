import type { LanguageDirection, Phrase } from './types';
import type { SpeechLanguage } from '../speech/types';

type PhraseTextPair = Pick<Phrase, 'sourceLanguage' | 'targetLanguage' | 'sourceText' | 'resultText'>;

export type SpeechTarget = {
  text: string;
  language: SpeechLanguage;
};

export function getPhraseDirection(phrase: Pick<Phrase, 'sourceLanguage' | 'targetLanguage'>): LanguageDirection {
  return phrase.sourceLanguage === 'zh-TW' && phrase.targetLanguage === 'ja'
    ? 'zh-TW-to-ja'
    : 'ja-to-zh-TW';
}

function toSpeechLanguage(language: Phrase['targetLanguage']): SpeechLanguage {
  return language === 'ja' ? 'ja-JP' : 'zh-TW';
}

export function getMandarinText(phrase: PhraseTextPair) {
  if (phrase.sourceLanguage === 'zh-TW') {
    return phrase.sourceText;
  }

  if (phrase.targetLanguage === 'zh-TW') {
    return phrase.resultText;
  }

  return phrase.resultText;
}

export function getMainSpeechTarget(phrase: PhraseTextPair): SpeechTarget {
  return {
    text: phrase.resultText,
    language: toSpeechLanguage(phrase.targetLanguage),
  };
}

export function getOriginalSpeechTarget(phrase: PhraseTextPair): SpeechTarget | null {
  if (phrase.sourceLanguage !== 'zh-TW' || phrase.targetLanguage !== 'ja') {
    return null;
  }

  return {
    text: phrase.sourceText,
    language: 'zh-TW',
  };
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
