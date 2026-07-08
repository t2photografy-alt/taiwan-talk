import { createId } from '../utils/id';
import { nowIso } from '../utils/date';
import { mockConversationProvider, type ConversationProvider } from './mockConversationProvider';
import type {
  ConversationRequest,
  ConversationResult,
  MessageReplyRequest,
  Phrase,
} from './types';

export type ConversationService = {
  generate(request: ConversationRequest): Promise<ConversationResult>;
  analyzeMessage(text: string): ReturnType<ConversationProvider['analyzeMessage']>;
  createReply(request: MessageReplyRequest): Promise<ConversationResult>;
  toPhrase(result: ConversationResult, overrides?: Partial<Phrase>): Phrase;
};

export function createConversationService(
  provider: ConversationProvider = mockConversationProvider,
): ConversationService {
  return {
    generate(request) {
      return provider.generate(request);
    },
    analyzeMessage(text) {
      return provider.analyzeMessage(text);
    },
    createReply(request) {
      return provider.createReply(request);
    },
    toPhrase(result, overrides = {}) {
      const timestamp = nowIso();

      return {
        id: createId(overrides.id?.startsWith('draft') ? 'draft' : 'phrase'),
        sourceText: result.sourceText,
        resultText: result.resultText,
        sourceLanguage: result.sourceLanguage,
        targetLanguage: result.targetLanguage,
        pinyin: result.pinyin,
        tone: result.tone,
        category: result.category,
        nuance: result.nuance,
        readabilityScore: result.readabilityScore,
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
