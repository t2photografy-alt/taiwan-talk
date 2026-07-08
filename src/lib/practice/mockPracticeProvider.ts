import type { Phrase, PracticeResult } from '../conversation/types';
import { nowIso } from '../utils/date';

export type PracticeProvider = {
  checkPronunciation(phrase: Phrase): Promise<PracticeResult>;
};

export const mockPracticeProvider: PracticeProvider = {
  async checkPronunciation(phrase) {
    const baseScore = phrase.practiceCount > 0 ? 86 : 82;

    return {
      phraseId: phrase.id,
      score: baseScore,
      pronunciationCloseness: Math.min(92, baseScore - 4),
      naturalFlow: Math.min(94, baseScore + 4),
      recognizedWordCount: 5,
      totalWordCount: 6,
      advice: '「見 jian」をもう少しはっきり言うと、もっと自然になります！',
      createdAt: nowIso(),
    };
  },
};
