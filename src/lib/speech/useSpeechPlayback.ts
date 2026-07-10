import { useCallback, useEffect, useRef, useState } from 'react';
import { speechService } from './speechService';
import type {
  SpeechLanguage,
  SpeechPlaybackSpeed,
  SpeechProvider,
  SpeechStatus,
  TtsVoiceStyle,
} from './types';

type PlaybackState = {
  phraseId: string | null;
  mode: SpeechPlaybackSpeed | null;
  status: SpeechStatus;
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
    const requestSequence = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestSequence;
    setPlayback((current) =>
      current.status === 'idle' ? current : { ...current, status: 'stopping' },
    );
    setProvider(undefined);
    speechService.stop();
    window.setTimeout(() => {
      if (requestSequenceRef.current === requestSequence) setPlayback(idlePlayback);
    }, 0);
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
            if (requestSequenceRef.current === requestSequence) {
              setProvider(undefined);
              setPlayback(idlePlayback);
            }
          },
          onPause: () => {
            if (requestSequenceRef.current === requestSequence) {
              setProvider(undefined);
              setPlayback(idlePlayback);
            }
          },
          onResume: (nextProvider) => {
            if (requestSequenceRef.current !== requestSequence) return;
            setProvider(nextProvider);
            setPlayback({ phraseId, mode: speed, status: 'playing' });
          },
          onError: (message) => {
            if (requestSequenceRef.current !== requestSequence) return;
            setProvider(undefined);
            setPlayback({ phraseId, mode: speed, status: 'error' });
            setError(message);
            window.setTimeout(() => {
              if (requestSequenceRef.current === requestSequence) setPlayback(idlePlayback);
            }, 0);
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

  const isStopping = useCallback(
    (phraseId: string, speed: SpeechPlaybackSpeed) =>
      playback.phraseId === phraseId && playback.mode === speed && playback.status === 'stopping',
    [playback],
  );

  useEffect(
    () => () => {
      requestSequenceRef.current += 1;
      speechService.stop();
    },
    [],
  );

  return {
    error,
    isLoading,
    isPlaying,
    isStopping,
    playingMode: playback.mode,
    playingPhraseId: playback.phraseId,
    provider,
    stop,
    toggle,
  };
}
