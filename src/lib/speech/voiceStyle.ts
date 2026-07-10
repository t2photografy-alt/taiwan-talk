import type { TtsVoiceStyle } from './types';

export const TTS_VOICE_STYLE_STORAGE_KEY = 'taiwan-talk-tts-voice-style';

const voiceStyles: TtsVoiceStyle[] = ['natural-soft', 'natural-calm'];

export function isTtsVoiceStyle(value: unknown): value is TtsVoiceStyle {
  return typeof value === 'string' && voiceStyles.includes(value as TtsVoiceStyle);
}

export function readTtsVoiceStyle(): TtsVoiceStyle {
  if (typeof window === 'undefined') {
    return 'natural-soft';
  }

  const storedValue = window.localStorage.getItem(TTS_VOICE_STYLE_STORAGE_KEY);
  return isTtsVoiceStyle(storedValue) ? storedValue : 'natural-soft';
}

export function writeTtsVoiceStyle(style: TtsVoiceStyle) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(TTS_VOICE_STYLE_STORAGE_KEY, style);
}
