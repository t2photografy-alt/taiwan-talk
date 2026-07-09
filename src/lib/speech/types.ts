export type SpeechPlaybackSpeed = 'normal' | 'slow';

export type SpeechPlaybackCallbacks = {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
};

export type SpeechPlaybackOptions = {
  speed?: SpeechPlaybackSpeed;
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
