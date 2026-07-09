import type {
  ConversationResult,
  LanguageCode,
  PhraseCategory,
  PhraseReviewStatus,
  Tone,
} from './types';

export type GenerateConversationMode = 'quick' | 'compose' | 'message-reply';

export type GenerateConversationRequest = {
  mode: GenerateConversationMode;
  sourceText: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  tone: Tone;
  category?: PhraseCategory;
  purpose?: string;
  relationship?: string;
  replyIntent?: string;
};

export type GeneratedConversationResult = ConversationResult & {
  needsNativeCheck: true;
  reviewStatus: Extract<PhraseReviewStatus, 'needs-native-check'>;
  naturalnessNote?: string;
};

export type GenerateConversationResponse = {
  ok: true;
  result: GeneratedConversationResult;
  meta: {
    provider: 'openai' | 'mock';
    model?: string;
    generatedAt: string;
  };
};

export type GenerateConversationErrorCode =
  | 'missing-api-key'
  | 'disabled'
  | 'invalid-request'
  | 'openai-error'
  | 'parse-error'
  | 'rate-limited'
  | 'unknown';

export type GenerateConversationErrorResponse = {
  ok: false;
  error: {
    code: GenerateConversationErrorCode;
    message: string;
  };
  fallback?: GeneratedConversationResult;
};
