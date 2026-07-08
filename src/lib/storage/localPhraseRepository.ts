import type { Phrase } from '../conversation/types';
import { nowIso } from '../utils/date';
import type { PhraseRepository } from './phraseRepository';

const STORAGE_KEY = 'taiwan-talk:phrases:v1';

function readPhrases(): Phrase[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePhrases(phrases: Phrase[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(phrases));
}

function sortPhrases(phrases: Phrase[]) {
  return [...phrases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export const localPhraseRepository: PhraseRepository = {
  async list() {
    return sortPhrases(readPhrases());
  },

  async get(id) {
    return readPhrases().find((phrase) => phrase.id === id);
  },

  async save(phrase) {
    const phrases = readPhrases();
    const timestamp = nowIso();
    const existingIndex = phrases.findIndex((item) => item.id === phrase.id);
    const nextPhrase = {
      ...phrase,
      updatedAt: timestamp,
      createdAt: phrase.createdAt || timestamp,
    };

    if (existingIndex >= 0) {
      phrases[existingIndex] = nextPhrase;
    } else {
      phrases.unshift(nextPhrase);
    }

    writePhrases(sortPhrases(phrases));
    return nextPhrase;
  },

  async remove(id) {
    writePhrases(readPhrases().filter((phrase) => phrase.id !== id));
  },

  async toggleFavorite(id) {
    const phrases = readPhrases();
    const target = phrases.find((phrase) => phrase.id === id);
    if (!target) {
      return undefined;
    }

    target.isFavorite = !target.isFavorite;
    target.updatedAt = nowIso();
    writePhrases(sortPhrases(phrases));
    return target;
  },

  async incrementUsed(id) {
    const phrases = readPhrases();
    const target = phrases.find((phrase) => phrase.id === id);
    if (!target) {
      return undefined;
    }

    target.usedCount += 1;
    target.updatedAt = nowIso();
    writePhrases(sortPhrases(phrases));
    return target;
  },

  async markPracticed(id) {
    const phrases = readPhrases();
    const target = phrases.find((phrase) => phrase.id === id);
    if (!target) {
      return undefined;
    }

    target.practiceCount += 1;
    target.lastPracticedAt = nowIso();
    target.updatedAt = nowIso();
    writePhrases(sortPhrases(phrases));
    return target;
  },
};
