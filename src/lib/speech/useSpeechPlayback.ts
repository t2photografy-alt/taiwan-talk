import { useCallback, useEffect, useRef, useState } from 'react';
import { speechService } from './speechService';
import type {
  SpeechLanguage,
  SpeechPlaybackSpeed,
  SpeechProvider,
  TtsVoiceStyle,
} from './types';

type PlaybackState = {
  phraseId: string | null;
  mode: SpeechPlaybackSpeed | null;
  status: 'idle' | 'loading' | 'playing';
};

type TogglePlaybackOptions = {
  phraseId: string;
  text: string;
  language?: SpeechLanguage;
  speed: SpeechPlaybackSpeed;
  voiceStyle?: TtsVoiceStyle;
};

const idlePlayback: PlaybackState = {
  phraseId: null,
  mode: null,
  status: 'idle',
};

export function useSpeechPlayback() {
  const [playback, setPlayback] = useState<PlaybackState>(idlePlayback);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState<SpeechProvider | undefined>();
  const requestSequenceRef = useRef(0);

  const stop = useCallback(() => {
    requestSequenceRef.current += 1;
    speechService.stop();
    setPlayback(idlePlayback);
  }, []);

  const toggle = useCallback(
    async ({ phraseId, text, language, speed, voiceStyle }: TogglePlaybackOptions) => {
      setError('');

      if (
        playback.phraseId === phraseId &&
        playback.mode === speed &&
        playback.status !== 'idle'
      ) {
        stop();
        return;
      }

      const requestSequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestSequence;
      setProvider(undefined);
      setPlayback({ phraseId, mode: speed, status: 'loading' });

      const result = await speechService.speak(text, {
        language,
        speed,
        voiceStyle,
        callbacks: {
          onProviderChange: (nextProvider) => setProvider(nextProvider),
          onStart: (nextProvider) => {
            if (requestSequenceRef.current !== requestSequence) return;
            setProvider(nextProvider);
            setPlayback({ phraseId, mode: speed, status: 'playing' });
          },
          onEnd: () => {
            if (requestSequenceRef.current === requestSequence) setPlayback(idlePlayback);
          },
          onError: (message) => {
            if (requestSequenceRef.current !== requestSequence) return;
            setPlayback(idlePlayback);
            setError(message);
          },
        },
      });

      if (requestSequenceRef.current !== requestSequence || result.ok || result.cancelled) return;
      setPlayback(idlePlayback);
      setError(result.message);
    },
    [playback.mode, playback.phraseId, playback.status, stop],
  );

  const isPlaying = useCallback(
    (phraseId: string, speed: SpeechPlaybackSpeed) =>
      playback.phraseId === phraseId && playback.mode === speed && playback.status === 'playing',
    [playback],
  );

  const isLoading = useCallback(
    (phraseId: string, speed: SpeechPlaybackSpeed) =>
      playback.phraseId === phraseId && playback.mode === speed && playback.status === 'loading',
    [playback],
  );

  useEffect(() => stop, [stop]);

  return {
    error,
    isLoading,
    isPlaying,
    playingMode: playback.mode,
    playingPhraseId: playback.phraseId,
    provider,
    stop,
    toggle,
  };
}
