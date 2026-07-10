import type {
  SpeechPlaybackCallbacks,
  SpeechPlaybackResult,
  TtsLanguage,
  TtsSpeedMode,
} from './types';

const BROWSER_SPEECH_RATES: Record<TtsSpeedMode, number> = {
  normal: 1,
  slow: 0.75,
};

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

function scoreVoice(voice: SpeechSynthesisVoice, language: TtsLanguage) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();

  if (language === 'ja-JP') {
    if (lang === 'ja-jp') return 100;
    return lang.startsWith('ja') || name.includes('japanese') || name.includes('日本') ? 80 : 0;
  }

  if (lang === 'zh-tw') return 100;
  if (lang.includes('zh-tw') || name.includes('taiwan')) return 90;
  if (lang.includes('zh-hant') || name.includes('traditional')) return 80;
  return lang.startsWith('zh') || name.includes('mandarin') ? 60 : 0;
}

function pickVoice(voices: SpeechSynthesisVoice[], language: TtsLanguage) {
  return [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice, language) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

class BrowserSpeechFallback {
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  isSupported() {
    return Boolean(getSpeechSynthesis() && getUtteranceConstructor());
  }

  stop() {
    const utterance = this.activeUtterance;
    this.activeUtterance = null;
    if (utterance) {
      utterance.onstart = null;
      utterance.onend = null;
      utterance.onerror = null;
      utterance.onpause = null;
      utterance.onresume = null;
    }
    getSpeechSynthesis()?.cancel();
  }

  speak(
    text: string,
    language: TtsLanguage,
    speedMode: TtsSpeedMode,
    callbacks?: SpeechPlaybackCallbacks,
  ): SpeechPlaybackResult {
    const synthesis = getSpeechSynthesis();
    const Utterance = getUtteranceConstructor();

    if (!synthesis || !Utterance) {
      return { ok: false, message: 'この端末では音声再生が使えない可能性があります。' };
    }

    try {
      synthesis.cancel();
      const utterance = new Utterance(text);
      const voice = pickVoice(synthesis.getVoices(), language);

      utterance.lang = language;
      utterance.rate = BROWSER_SPEECH_RATES[speedMode];
      utterance.pitch = 1;
      utterance.volume = 1;
      if (voice) utterance.voice = voice;

      utterance.onstart = () => {
        if (this.activeUtterance !== utterance) return;
        this.activeUtterance = utterance;
        callbacks?.onProviderChange?.('browser-fallback');
        callbacks?.onStart?.('browser-fallback');
      };
      utterance.onend = () => {
        if (this.activeUtterance !== utterance) return;
        this.activeUtterance = null;
        callbacks?.onEnd?.();
      };
      utterance.onerror = () => {
        if (this.activeUtterance !== utterance) return;
        this.activeUtterance = null;
        callbacks?.onError?.('端末の音声でも再生できませんでした。');
      };
      utterance.onpause = () => {
        if (this.activeUtterance === utterance) callbacks?.onPause?.();
      };
      utterance.onresume = () => {
        if (this.activeUtterance === utterance) callbacks?.onResume?.('browser-fallback');
      };

      this.activeUtterance = utterance;
      synthesis.speak(utterance);
      return { ok: true, provider: 'browser-fallback' };
    } catch {
      this.activeUtterance = null;
      return { ok: false, message: '端末の音声でも再生できませんでした。' };
    }
  }
}

export const browserSpeechFallback = new BrowserSpeechFallback();
