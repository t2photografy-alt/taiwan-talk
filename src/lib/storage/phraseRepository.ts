import type { Phrase } from '../conversation/types';

export type PhraseRepository = {
  list(): Promise<Phrase[]>;
  get(id: string): Promise<Phrase | undefined>;
  save(phrase: Phrase): Promise<Phrase>;
  remove(id: string): Promise<void>;
  toggleFavorite(id: string): Promise<Phrase | undefined>;
  incrementUsed(id: string): Promise<Phrase | undefined>;
  markPracticed(id: string): Promise<Phrase | undefined>;
};
