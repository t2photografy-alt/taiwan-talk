export type RecorderState = 'idle' | 'recording' | 'recorded' | 'error';

export type RecorderErrorCode =
  | 'not-supported'
  | 'not-secure'
  | 'permission-denied'
  | 'start-failed'
  | 'empty-recording'
  | 'stop-failed';

export type RecorderError = {
  code: RecorderErrorCode;
  message: string;
};

export type RecordedAudio = {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
};

export type RecorderSession = {
  startedAt: number;
  stop: () => Promise<RecordedAudio>;
  cancel: () => void;
};

export type StartRecordingResult =
  | {
      ok: true;
      session: RecorderSession;
    }
  | {
      ok: false;
      error: RecorderError;
    };
