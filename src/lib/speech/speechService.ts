import type {
  SpeechLanguage,
  SpeechPlaybackOptions,
  SpeechPlaybackResult,
  SpeechPlaybackSpeed,
  VoicePreference,
} from './types';
import { readVoicePreference } from './voicePreference';

export const SPEECH_RATES = {
  normal: 1,
  slow: 0.6,
} as const;

const DEFAULT_LANGUAGE: SpeechLanguage = 'zh-TW';
const FEMALE_VOICE_HINTS = ['female', 'woman', 'girl', 'mei', 'mei-jia', 'ting', 'han', 'li'];
const MALE_VOICE_HINTS = ['male', 'man', 'boy', 'yun', 'kangkang'];

function getSpeechSynthesis() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  return window.speechSynthesis;
}

function getUtteranceConstructor() {
  if (typeof window === 'undefined' || !('SpeechSynthesisUtterance' in window)) {
    return null;
  }

  return window.SpeechSynthesisUtterance;
}

function preferenceScore(name: string, voicePreference: VoicePreference) {
  if (voicePreference === 'auto') {
    return 0;
  }

  // Web Speech API voices are device-dependent and do not reliably expose gender.
  const hints = voicePreference === 'female' ? FEMALE_VOICE_HINTS : MALE_VOICE_HINTS;
  return hints.some((hint) => name.includes(hint)) ? 8 : 0;
}

function scoreVoice(
  voice: SpeechSynthesisVoice,
  voicePreference: VoicePreference,
  language: SpeechLanguage,
) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();
  const preferred = preferenceScore(name, voicePreference);

  if (language === 'ja-JP') {
    if (lang === 'ja-jp') {
      return 100 + preferred;
    }

    if (lang.startsWith('ja') || name.includes('japanese') || name.includes('日本')) {
      return 85 + preferred;
    }

    return 0;
  }

  if (lang === 'zh-tw') {
    return 100 + preferred;
  }

  if (lang.includes('zh-tw') || name.includes('taiwan')) {
    return 90 + preferred;
  }

  if (lang.includes('zh-hant') || name.includes('traditional')) {
    return 80 + preferred;
  }

  return lang.startsWith('zh') || name.includes('chinese') || name.includes('mandarin')
    ? 70 + preferred
    : 0;
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  voicePreference: VoicePreference,
  language: SpeechLanguage,
) {
  return [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, voicePreference, language) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

function rateForSpeed(speed: SpeechPlaybackSpeed) {
  return SPEECH_RATES[speed];
}

class BrowserSpeechService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  isSupported() {
    return Boolean(getSpeechSynthesis() && getUtteranceConstructor());
  }

  stop() {
    const synthesis = getSpeechSynthesis();
    if (!synthesis) {
      return;
    }

    synthesis.cancel();
    this.activeUtterance = null;
  }

  speak(text: string, options: SpeechPlaybackOptions = {}): SpeechPlaybackResult {
    const trimmedText = text.trim();
    const synthesis = getSpeechSynthesis();
    const Utterance = getUtteranceConstructor();
    const callbacks = options.callbacks;
    const voicePreference = options.voicePreference ?? readVoicePreference();
    const language = options.language ?? DEFAULT_LANGUAGE;

    if (!trimmedText) {
      return { ok: false, message: '再生するテキストがありません。' };
    }

    if (!synthesis || !Utterance) {
      return { ok: false, message: 'この端末では音声再生が使えないかもしれません。' };
    }

    try {
      synthesis.cancel();

      const utterance = new Utterance(trimmedText);
      const voice = pickVoice(synthesis.getVoices(), voicePreference, language);

      utterance.lang = language;
      utterance.rate = rateForSpeed(options.speed ?? 'normal');
      utterance.pitch = 1;
      utterance.volume = 1;

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onstart = () => {
        this.activeUtterance = utterance;
        callbacks?.onStart?.();
      };

      utterance.onend = () => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        callbacks?.onEnd?.();
      };

      utterance.onerror = () => {
        if (this.activeUtterance === utterance) {
          this.activeUtterance = null;
        }
        callbacks?.onError?.('音声を再生できませんでした。端末の設定を確認してください。');
      };

      this.activeUtterance = utterance;
      synthesis.speak(utterance);
      callbacks?.onStart?.();

      return { ok: true };
    } catch {
      this.activeUtterance = null;
      return { ok: false, message: '音声を再生できませんでした。端末の設定を確認してください。' };
    }
  }
}

export const speechService = new BrowserSpeechService();
