export type LanguageDirection = 'ja-to-zh-TW' | 'zh-TW-to-ja';

export type Tone = 'friendly' | 'polite' | 'casual' | 'event' | 'dm';

export type PhraseReviewStatus =
  | 'draft'
  | 'needs-native-check'
  | 'reviewed'
  | 'approved'
  | 'rejected';

export type PhraseCategory =
  | 'greeting'
  | 'thanks'
  | 'photo'
  | 'event'
  | 'oshi'
  | 'dm'
  | 'seeAgain'
  | 'other';

export type LanguageCode = 'ja' | 'zh-TW';

export type Phrase = {
  id: string;
  sourceText: string;
  resultText: string;
  /** 原文の意味を対象言語で確認するための、短く自然な補助説明。 */
  literalMeaning?: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  /**
   * Pinyin for the Taiwanese Mandarin text in the phrase pair.
   * ja-to-zh-TW: pinyin for resultText.
   * zh-TW-to-ja: pinyin for sourceText.
   */
  pinyin?: string;
  tone: Tone;
  category: PhraseCategory;
  note?: string;
  nuance?: string;
  readabilityScore?: number;
  needsNativeCheck?: boolean;
  reviewStatus?: PhraseReviewStatus;
  naturalnessNote?: string;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
  practiceCount: number;
  usedCount: number;
  lastPracticedAt?: string;
};

export type PracticeResult = {
  phraseId: string;
  score: number;
  pronunciationCloseness: number;
  naturalFlow: number;
  recognizedWordCount: number;
  totalWordCount: number;
  advice: string;
  createdAt: string;
};

export type ConversationResult = {
  sourceText: string;
  resultText: string;
  /** 原文の意味を対象言語で確認するための、短く自然な補助説明。 */
  literalMeaning?: string;
  pinyin?: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  tone: Tone;
  category: PhraseCategory;
  nuance: string;
  alternatives?: Array<{
    label: string;
    resultText: string;
    pinyin?: string;
    note?: string;
  }>;
  readabilityScore?: number;
  needsNativeCheck?: boolean;
  reviewStatus?: PhraseReviewStatus;
  naturalnessNote?: string;
};

export type ConversationRequest = {
  sourceText: string;
  direction: LanguageDirection;
  tone: Tone;
  category: PhraseCategory;
};

export type MessageAnalysis = {
  sourceText: string;
  detectedLanguage: LanguageCode;
  summaryJa: string;
  nuance: string;
  confidence: number;
};

export type ReplyIntent =
  | 'happy'
  | 'thanks'
  | 'seeAgain'
  | 'askSchedule'
  | 'softDecline'
  | 'sendPhoto';

export type MessageReplyRequest = {
  incomingText: string;
  intent: ReplyIntent;
  tone: Tone;
};
