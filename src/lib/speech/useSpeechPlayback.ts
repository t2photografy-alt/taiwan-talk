import { useCallback, useEffect, useState } from 'react';
import { speechService } from './speechService';
import type { SpeechPlaybackSpeed } from './types';
import { readVoicePreference } from './voicePreference';

type PlaybackState = {
  phraseId: string | null;
  mode: SpeechPlaybackSpeed | null;
};

type TogglePlaybackOptions = {
  phraseId: string;
  text: string;
  speed: SpeechPlaybackSpeed;
};

const idlePlayback: PlaybackState = {
  phraseId: null,
  mode: null,
};

export function useSpeechPlayback() {
  const [playback, setPlayback] = useState<PlaybackState>(idlePlayback);
  const [error, setError] = useState('');

  const stop = useCallback(() => {
    speechService.stop();
    setPlayback(idlePlayback);
  }, []);

  const toggle = useCallback(
    ({ phraseId, text, speed }: TogglePlaybackOptions) => {
      setError('');

      if (playback.phraseId === phraseId && playback.mode === speed) {
        stop();
        return;
      }

      const result = speechService.speak(text, {
        speed,
        voicePreference: readVoicePreference(),
        callbacks: {
          onStart: () => setPlayback({ phraseId, mode: speed }),
          onEnd: () => {
            setPlayback((current) =>
              current.phraseId === phraseId && current.mode === speed ? idlePlayback : current,
            );
          },
          onError: (message) => {
            setPlayback(idlePlayback);
            setError(message);
          },
        },
      });

      if (!result.ok) {
        setPlayback(idlePlayback);
        setError(result.message);
      }
    },
    [playback.mode, playback.phraseId, stop],
  );

  const isPlaying = useCallback(
    (phraseId: string, speed: SpeechPlaybackSpeed) =>
      playback.phraseId === phraseId && playback.mode === speed,
    [playback.mode, playback.phraseId],
  );

  useEffect(() => stop, [stop]);

  return {
    error,
    isPlaying,
    playingMode: playback.mode,
    playingPhraseId: playback.phraseId,
    stop,
    toggle,
  };
}
