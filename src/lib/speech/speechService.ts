import { aiSpeechProvider } from './aiSpeechProvider';
import { browserSpeechFallback } from './browserSpeechFallback';
import type {
  SpeechPlaybackOptions,
  SpeechPlaybackResult,
  TtsLanguage,
  TtsSpeedMode,
  TtsVoiceStyle,
} from './types';
import { readTtsVoiceStyle } from './voiceStyle';

const DEFAULT_LANGUAGE: TtsLanguage = 'zh-TW';
const DEFAULT_SPEED: TtsSpeedMode = 'normal';

class SpeechService {
  private activeAbortController: AbortController | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private activeObjectUrl: string | null = null;
  private activeOnEnd: (() => void) | null = null;
  private playbackSequence = 0;

  private releaseAiAudio() {
    if (this.activeAudio) {
      this.activeAudio.onended = null;
      this.activeAudio.onerror = null;
      this.activeAudio.pause();
      this.activeAudio.currentTime = 0;
      this.activeAudio = null;
    }

    if (this.activeObjectUrl) {
      URL.revokeObjectURL(this.activeObjectUrl);
      this.activeObjectUrl = null;
    }
  }

  isSupported() {
    return typeof Audio !== 'undefined' || browserSpeechFallback.isSupported();
  }

  stop() {
    const onEnd = this.activeOnEnd;
    this.activeOnEnd = null;
    this.playbackSequence += 1;
    this.activeAbortController?.abort();
    this.activeAbortController = null;
    this.releaseAiAudio();
    browserSpeechFallback.stop();
    onEnd?.();
  }

  private playBrowserFallback(
    text: string,
    language: TtsLanguage,
    speedMode: TtsSpeedMode,
    options: SpeechPlaybackOptions,
  ) {
    const callbacks = options.callbacks;
    return browserSpeechFallback.speak(text, language, speedMode, {
      ...callbacks,
      onEnd: () => {
        if (this.activeOnEnd !== callbacks?.onEnd) return;
        this.activeOnEnd = null;
        callbacks?.onEnd?.();
      },
      onError: (message) => {
        this.activeOnEnd = null;
        callbacks?.onError?.(message);
      },
    });
  }

  async speak(text: string, options: SpeechPlaybackOptions = {}): Promise<SpeechPlaybackResult> {
    const trimmedText = text.trim();
    if (!trimmedText) return { ok: false, message: '再生するテキストがありません。' };

    this.stop();
    const sequence = this.playbackSequence;
    const language = options.language ?? DEFAULT_LANGUAGE;
    const speedMode = options.speed ?? DEFAULT_SPEED;
    const voiceStyle: TtsVoiceStyle = options.voiceStyle ?? readTtsVoiceStyle();
    const abortController = new AbortController();
    this.activeAbortController = abortController;
    this.activeOnEnd = options.callbacks?.onEnd ?? null;

    try {
      const blob = await aiSpeechProvider.generate(
        { text: trimmedText, language, voiceStyle, speedMode },
        abortController.signal,
      );

      if (abortController.signal.aborted || sequence !== this.playbackSequence) {
        return { ok: false, message: '音声再生を停止しました。', cancelled: true };
      }

      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      this.activeObjectUrl = objectUrl;
      this.activeAudio = audio;
      this.activeAbortController = null;

      audio.onended = () => {
        if (this.activeAudio !== audio) return;
        this.activeOnEnd = null;
        this.releaseAiAudio();
        options.callbacks?.onEnd?.();
      };
      audio.onerror = () => {
        if (this.activeAudio !== audio) return;
        this.releaseAiAudio();
        const fallback = this.playBrowserFallback(trimmedText, language, speedMode, options);
        if (!fallback.ok) options.callbacks?.onError?.(fallback.message);
      };

      await audio.play();
      if (sequence !== this.playbackSequence) {
        this.releaseAiAudio();
        return { ok: false, message: '音声再生を停止しました。', cancelled: true };
      }

      options.callbacks?.onProviderChange?.('openai-tts');
      options.callbacks?.onStart?.('openai-tts');
      return { ok: true, provider: 'openai-tts' };
    } catch (error) {
      this.activeAbortController = null;
      if (abortController.signal.aborted || sequence !== this.playbackSequence) {
        return { ok: false, message: '音声再生を停止しました。', cancelled: true };
      }

      const fallback = this.playBrowserFallback(trimmedText, language, speedMode, options);
      if (fallback.ok) return fallback;

      const message =
        error instanceof Error && error.message
          ? `${error.message} ${fallback.message}`
          : fallback.message;
      this.activeOnEnd = null;
      options.callbacks?.onError?.(message);
      return { ok: false, message };
    }
  }
}

export const speechService = new SpeechService();
