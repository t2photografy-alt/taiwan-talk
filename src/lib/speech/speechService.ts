import type { SpeechPlaybackOptions, SpeechPlaybackResult, SpeechPlaybackSpeed } from './types';

const NORMAL_RATE = 1;
const SLOW_RATE = 0.78;
const TARGET_LANG = 'zh-TW';

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

function scoreVoice(voice: SpeechSynthesisVoice) {
  const lang = voice.lang.toLowerCase();
  const name = voice.name.toLowerCase();

  if (lang === 'zh-tw') {
    return 100;
  }

  if (lang.includes('zh-tw') || name.includes('taiwan')) {
    return 90;
  }

  if (lang.includes('zh-hant') || name.includes('traditional')) {
    return 80;
  }

  if (lang.startsWith('zh') || name.includes('chinese') || name.includes('mandarin')) {
    return 70;
  }

  return 0;
}

function pickTaiwanVoice(voices: SpeechSynthesisVoice[]) {
  return [...voices]
    .map((voice) => ({ voice, score: scoreVoice(voice) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)[0]?.voice;
}

function rateForSpeed(speed: SpeechPlaybackSpeed) {
  return speed === 'slow' ? SLOW_RATE : NORMAL_RATE;
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

    if (!trimmedText) {
      return { ok: false, message: '再生する台湾華語テキストがありません。' };
    }

    if (!synthesis || !Utterance) {
      return { ok: false, message: 'この端末では音声再生が使えないかもしれません。' };
    }

    try {
      synthesis.cancel();

      const utterance = new Utterance(trimmedText);
      const voice = pickTaiwanVoice(synthesis.getVoices());

      utterance.lang = TARGET_LANG;
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
