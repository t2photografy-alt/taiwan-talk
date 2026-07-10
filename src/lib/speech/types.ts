export type TtsVoiceStyle = 'natural-soft' | 'natural-calm';

export type TtsSpeedMode = 'normal' | 'slow';

export type TtsLanguage = 'ja-JP' | 'zh-TW';

export type SpeechPlaybackSpeed = TtsSpeedMode;

export type SpeechLanguage = TtsLanguage;

export type SpeechProvider = 'openai-tts' | 'browser-fallback';

export type SpeechStatus = 'idle' | 'loading' | 'playing' | 'stopping' | 'error';

export type SpeechPlaybackState = {
  provider?: SpeechProvider;
  status: SpeechStatus;
  playingKey?: string;
  error?: string;
};

export type SpeechPlaybackCallbacks = {
  onStart?: (provider: SpeechProvider) => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  onPause?: () => void;
  onProviderChange?: (provider: SpeechProvider) => void;
  onResume?: (provider: SpeechProvider) => void;
};

export type SpeechPlaybackOptions = {
  speed?: TtsSpeedMode;
  language?: TtsLanguage;
  voiceStyle?: TtsVoiceStyle;
  callbacks?: SpeechPlaybackCallbacks;
};

export type SpeechPlaybackResult =
  | {
      ok: true;
      provider: SpeechProvider;
    }
  | {
      ok: false;
      message: string;
      cancelled?: boolean;
    };
