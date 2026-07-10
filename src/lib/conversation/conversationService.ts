import { createId } from '../utils/id';
import { nowIso } from '../utils/date';
import type {
  GeneratedConversationResult,
  GenerateConversationRequest,
  GenerateConversationResponse,
} from './apiTypes';
import { mockConversationProvider, type ConversationProvider } from './mockConversationProvider';
import type {
  ConversationRequest,
  ConversationResult,
  LanguageCode,
  MessageReplyRequest,
  Phrase,
} from './types';

const photoIntentPattern = /写真|撮|撮らせ|拍|照/;
const photoResultPattern = /拍|照|照片|相片/;
const seeAgainReplyPattern = /下次|再|見|一起|玩/;

export type ConversationService = {
  generate(request: ConversationRequest): Promise<ConversationResult>;
  analyzeMessage(text: string): ReturnType<ConversationProvider['analyzeMessage']>;
  createReply(request: MessageReplyRequest): Promise<ConversationResult>;
  toPhrase(result: ConversationResult, overrides?: Partial<Phrase>): Phrase;
};

function withNativeCheck(result: ConversationResult): GeneratedConversationResult {
  return {
    ...result,
    needsNativeCheck: true,
    reviewStatus: 'needs-native-check',
    naturalnessNote:
      result.naturalnessNote ?? 'AI生成または仮生成のため、台湾華語表現はネイティブ確認前です。',
  };
}

function directionToLanguages(direction: ConversationRequest['direction']): {
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
} {
  return direction === 'ja-to-zh-TW'
    ? { sourceLanguage: 'ja', targetLanguage: 'zh-TW' }
    : { sourceLanguage: 'zh-TW', targetLanguage: 'ja' };
}

function buildGenerateApiRequest(request: ConversationRequest): GenerateConversationRequest {
  const languages = directionToLanguages(request.direction);

  return {
    mode: 'compose',
    sourceText: request.sourceText,
    sourceLanguage: languages.sourceLanguage,
    targetLanguage: languages.targetLanguage,
    tone: request.tone,
    category: request.category,
    purpose: '対面で見せやすく、SNS/DMでも送りやすい短い会話表現を作る',
    relationship:
      request.tone === 'polite'
        ? '少し丁寧な距離感'
        : '友達・知人・パフォーマー・SNS/DM相手に自然に伝わる距離感',
  };
}

function buildReplyApiRequest(request: MessageReplyRequest): GenerateConversationRequest {
  return {
    mode: 'message-reply',
    sourceText: request.incomingText,
    sourceLanguage: 'zh-TW',
    targetLanguage: 'zh-TW',
    tone: request.tone,
    category: 'dm',
    purpose: '相手から届いた台湾華語メッセージへの自然な返信候補を作る',
    relationship: '対面後やSNS/DMで自然に返せる友達寄りの距離感',
    replyIntent: request.intent,
  };
}

function isApiResponse(value: unknown): value is GenerateConversationResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    (value as { ok: unknown }).ok === true &&
    typeof (value as { result?: { resultText?: unknown } }).result?.resultText === 'string'
  );
}

function isApiResultUsable(
  request: GenerateConversationRequest,
  result: GeneratedConversationResult,
) {
  if (
    !result.resultText.trim() ||
    result.targetLanguage !== request.targetLanguage ||
    result.needsNativeCheck !== true ||
    result.reviewStatus !== 'needs-native-check'
  ) {
    return false;
  }

  if ((request.targetLanguage === 'zh-TW' || request.sourceLanguage === 'zh-TW') && !result.pinyin?.trim()) {
    return false;
  }

  if (
    request.targetLanguage === 'zh-TW' &&
    photoIntentPattern.test(request.sourceText) &&
    !photoResultPattern.test(result.resultText)
  ) {
    return false;
  }

  if (
    request.mode === 'message-reply' &&
    (request.replyIntent === 'seeAgain' || request.replyIntent === 'また会いたい') &&
    !seeAgainReplyPattern.test(result.resultText)
  ) {
    return false;
  }

  return true;
}

async function requestApiGeneration(request: GenerateConversationRequest): Promise<GeneratedConversationResult> {
  const response = await fetch('/api/conversation/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  const payload = (await response.json().catch(() => null)) as unknown;

  if (response.ok && isApiResponse(payload)) {
    if (!isApiResultUsable(request, payload.result)) {
      throw new Error('AI generation result did not match the requested intent');
    }

    return withNativeCheck(payload.result);
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'fallback' in payload &&
    typeof (payload as { fallback?: { resultText?: unknown } }).fallback?.resultText === 'string'
  ) {
    return withNativeCheck((payload as { fallback: ConversationResult }).fallback);
  }

  throw new Error('AI generation API unavailable');
}

export function createConversationService(
  provider: ConversationProvider = mockConversationProvider,
): ConversationService {
  return {
    async generate(request) {
      try {
        return await requestApiGeneration(buildGenerateApiRequest(request));
      } catch {
        return withNativeCheck(await provider.generate(request));
      }
    },
    analyzeMessage(text) {
      return provider.analyzeMessage(text);
    },
    async createReply(request) {
      try {
        return await requestApiGeneration(buildReplyApiRequest(request));
      } catch {
        return withNativeCheck(await provider.createReply(request));
      }
    },
    toPhrase(result, overrides = {}) {
      const timestamp = nowIso();

      return {
        id: createId(overrides.id?.startsWith('draft') ? 'draft' : 'phrase'),
        sourceText: result.sourceText,
        resultText: result.resultText,
        literalMeaning: result.literalMeaning,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        pinyin: result.pinyin,
        tone: result.tone,
        category: result.category,
        nuance: result.nuance,
        readabilityScore: result.readabilityScore,
        needsNativeCheck: result.needsNativeCheck ?? true,
        reviewStatus: result.reviewStatus ?? 'needs-native-check',
        naturalnessNote:
          result.naturalnessNote ?? 'AI生成または仮生成のため、台湾華語表現はネイティブ確認前です。',
        createdAt: timestamp,
        updatedAt: timestamp,
        isFavorite: false,
        practiceCount: 0,
        usedCount: 0,
        ...overrides,
      };
    },
  };
}

export const conversationService = createConversationService();
