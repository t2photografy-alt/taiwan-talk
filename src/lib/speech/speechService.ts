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
  private activeStartResolver: ((result: SpeechPlaybackResult) => void) | null = null;
  private playbackSequence = 0;

  private releaseAiAudio() {
    const audio = this.activeAudio;
    this.activeAudio = null;
    if (audio) {
      audio.oncanplay = null;
      audio.onplaying = null;
      audio.onended = null;
      audio.onpause = null;
      audio.onerror = null;
      audio.onabort = null;
      audio.onstalled = null;
      audio.pause();
      audio.currentTime = 0;
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
    const resolveStart = this.activeStartResolver;
    this.activeOnEnd = null;
    this.activeStartResolver = null;
    this.playbackSequence += 1;
    this.activeAbortController?.abort();
    this.activeAbortController = null;
    this.releaseAiAudio();
    browserSpeechFallback.stop();
    resolveStart?.({ ok: false, message: '音声再生を停止しました。', cancelled: true });
    onEnd?.();
  }

  private playBrowserFallback(
    text: string,
    language: TtsLanguage,
    speedMode: TtsSpeedMode,
    options: SpeechPlaybackOptions,
    sequence: number,
  ) {
    const callbacks = options.callbacks;
    return browserSpeechFallback.speak(text, language, speedMode, {
      ...callbacks,
      onProviderChange: (provider) => {
        if (sequence === this.playbackSequence) callbacks?.onProviderChange?.(provider);
      },
      onStart: (provider) => {
        if (sequence !== this.playbackSequence) return;
        callbacks?.onStart?.(provider);
      },
      onEnd: () => {
        if (sequence !== this.playbackSequence) return;
        this.activeOnEnd = null;
        callbacks?.onEnd?.();
      },
      onError: (message) => {
        if (sequence !== this.playbackSequence) return;
        this.activeOnEnd = null;
        callbacks?.onError?.(message);
      },
      onPause: () => {
        if (sequence === this.playbackSequence) callbacks?.onPause?.();
      },
      onResume: (provider) => {
        if (sequence === this.playbackSequence) callbacks?.onResume?.(provider);
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

      let startPromiseSettled = false;
      let fallbackStarted = false;

      const finishAiPlayback = () => {
        if (this.activeAudio !== audio) return;
        const resolveStart = this.activeStartResolver;
        this.activeStartResolver = null;
        this.activeOnEnd = null;
        this.releaseAiAudio();
        resolveStart?.({ ok: false, message: '音声再生が終了しました。', cancelled: true });
        options.callbacks?.onEnd?.();
      };

      const startFallback = () => {
        if (
          fallbackStarted ||
          this.activeAudio !== audio ||
          abortController.signal.aborted ||
          sequence !== this.playbackSequence
        ) {
          return { ok: false, message: '音声再生を停止しました。', cancelled: true } as const;
        }

        fallbackStarted = true;
        this.releaseAiAudio();
        const fallback = this.playBrowserFallback(
          trimmedText,
          language,
          speedMode,
          options,
          sequence,
        );
        if (!fallback.ok) {
          this.activeOnEnd = null;
          options.callbacks?.onError?.(fallback.message);
        }
        return fallback;
      };

      const playbackResult = new Promise<SpeechPlaybackResult>((resolve) => {
        const resolvePlaybackStart = (result: SpeechPlaybackResult) => {
          if (startPromiseSettled) return;
          startPromiseSettled = true;
          if (this.activeStartResolver === resolvePlaybackStart) {
            this.activeStartResolver = null;
          }
          resolve(result);
        };
        this.activeStartResolver = resolvePlaybackStart;

        const failAiPlayback = () => {
          if (fallbackStarted) return;
          const fallback = startFallback();
          resolvePlaybackStart(fallback);
        };

        audio.oncanplay = () => {
          if (sequence !== this.playbackSequence) finishAiPlayback();
        };
        audio.onplaying = () => {
          if (startPromiseSettled || sequence !== this.playbackSequence) return;
          options.callbacks?.onProviderChange?.('openai-tts');
          options.callbacks?.onStart?.('openai-tts');
          resolvePlaybackStart({ ok: true, provider: 'openai-tts' });
        };
        audio.onended = finishAiPlayback;
        audio.onpause = finishAiPlayback;
        audio.onerror = failAiPlayback;
        audio.onabort = failAiPlayback;
        audio.onstalled = failAiPlayback;

        void audio.play().catch(failAiPlayback);
      });

      return await playbackResult;
    } catch (error) {
      this.activeAbortController = null;
      if (abortController.signal.aborted || sequence !== this.playbackSequence) {
        return { ok: false, message: '音声再生を停止しました。', cancelled: true };
      }

      this.releaseAiAudio();
      const fallback = this.playBrowserFallback(trimmedText, language, speedMode, options, sequence);
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
