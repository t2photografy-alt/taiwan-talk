import type { PresetPhrase, PhraseReviewStatus } from '../../data/presets';

export type PhraseReviewSummary = {
  total: number;
  needsNativeCheck: number;
  byStatus: Record<PhraseReviewStatus, number>;
};

const reviewStatuses: PhraseReviewStatus[] = [
  'draft',
  'needs-native-check',
  'reviewed',
  'approved',
  'rejected',
];

export function getPhraseReviewSummary(phrases: PresetPhrase[]): PhraseReviewSummary {
  const byStatus = reviewStatuses.reduce(
    (summary, status) => ({
      ...summary,
      [status]: phrases.filter((phrase) => phrase.reviewStatus === status).length,
    }),
    {} as Record<PhraseReviewStatus, number>,
  );

  return {
    total: phrases.length,
    needsNativeCheck: phrases.filter((phrase) => phrase.needsNativeCheck).length,
    byStatus,
  };
}

export function getUncheckedPresetPhrases(phrases: PresetPhrase[]) {
  return phrases.filter(
    (phrase) => phrase.needsNativeCheck || phrase.reviewStatus === 'needs-native-check',
  );
}
