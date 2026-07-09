export type SpeechPlaybackSpeed = 'normal' | 'slow';

export type VoicePreference = 'auto' | 'female' | 'male';

export type SpeechPlaybackCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

export type SpeechPlaybackOptions = {
  speed?: SpeechPlaybackSpeed;
  voicePreference?: VoicePreference;
  callbacks?: SpeechPlaybackCallbacks;
};

export type SpeechPlaybackResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
    };
