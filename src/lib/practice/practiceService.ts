import type { Phrase, PracticeResult } from '../conversation/types';
import { mockPracticeProvider, type PracticeProvider } from './mockPracticeProvider';

export type PracticeService = {
  checkPronunciation(phrase: Phrase): Promise<PracticeResult>;
};

export function createPracticeService(
  provider: PracticeProvider = mockPracticeProvider,
): PracticeService {
  return {
    checkPronunciation(phrase): Promise<PracticeResult> {
      return provider.checkPronunciation(phrase);
    },
  };
}

export const practiceService = createPracticeService();
