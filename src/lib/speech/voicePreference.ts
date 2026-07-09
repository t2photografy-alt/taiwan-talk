import type { VoicePreference } from './types';

export const VOICE_PREFERENCE_STORAGE_KEY = 'taiwan-talk-voice-preference';

const voicePreferences: VoicePreference[] = ['auto', 'female', 'male'];

export function isVoicePreference(value: unknown): value is VoicePreference {
  return typeof value === 'string' && voicePreferences.includes(value as VoicePreference);
}

export function readVoicePreference(): VoicePreference {
  if (typeof window === 'undefined') {
    return 'auto';
  }

  const storedValue = window.localStorage.getItem(VOICE_PREFERENCE_STORAGE_KEY);
  return isVoicePreference(storedValue) ? storedValue : 'auto';
}

export function writeVoicePreference(preference: VoicePreference) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(VOICE_PREFERENCE_STORAGE_KEY, preference);
}
