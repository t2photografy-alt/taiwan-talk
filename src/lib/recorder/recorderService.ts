import type { RecordedAudio, RecorderError, RecorderSession, StartRecordingResult } from './types';

const DEFAULT_RECORDER_ERROR =
  'マイクを使えませんでした。ブラウザの許可設定を確認してください。';

function createRecorderError(code: RecorderError['code'], message = DEFAULT_RECORDER_ERROR): RecorderError {
  return { code, message };
}

function getPreferredMimeType() {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    return '';
  }

  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? '';
}

function isLocalHost() {
  if (typeof window === 'undefined') {
    return false;
  }

  return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}

class BrowserRecorderSession implements RecorderSession {
  private chunks: Blob[] = [];
  private stopped = false;

  constructor(
    private readonly recorder: MediaRecorder,
    private readonly stream: MediaStream,
    public readonly startedAt: number,
    private readonly mimeType: string,
  ) {
    this.recorder.addEventListener('dataavailable', this.handleData);
  }

  private handleData = (event: Event) => {
    const data = (event as BlobEvent).data;

    if (data && data.size > 0) {
      this.chunks.push(data);
    }
  };

  private stopTracks() {
    this.stream.getTracks().forEach((track) => track.stop());
  }

  stop() {
    if (this.stopped) {
      return Promise.reject(
        createRecorderError('stop-failed', '録音を停止できませんでした。もう一度お試しください。'),
      );
    }

    this.stopped = true;

    return new Promise<RecordedAudio>((resolve, reject) => {
      const cleanup = () => {
        this.recorder.removeEventListener('dataavailable', this.handleData);
        this.stopTracks();
      };

      this.recorder.addEventListener(
        'stop',
        () => {
          cleanup();

          if (this.chunks.length === 0) {
            reject(createRecorderError('empty-recording', '録音データが空でした。もう一度お試しください。'));
            return;
          }

          const blob = new Blob(this.chunks, { type: this.mimeType || this.chunks[0].type || 'audio/webm' });
          resolve({
            blob,
            url: URL.createObjectURL(blob),
            mimeType: blob.type,
            durationMs: Math.max(0, Date.now() - this.startedAt),
          });
        },
        { once: true },
      );

      this.recorder.addEventListener(
        'error',
        () => {
          cleanup();
          reject(createRecorderError('stop-failed'));
        },
        { once: true },
      );

      try {
        if (this.recorder.state === 'inactive') {
          cleanup();
          reject(createRecorderError('stop-failed', '録音はすでに停止しています。'));
          return;
        }

        this.recorder.stop();
      } catch {
        cleanup();
        reject(createRecorderError('stop-failed'));
      }
    });
  }

  cancel() {
    try {
      if (this.recorder.state !== 'inactive') {
        this.recorder.stop();
      }
    } catch {
      // Best-effort cleanup only.
    } finally {
      this.recorder.removeEventListener('dataavailable', this.handleData);
      this.stopTracks();
    }
  }
}

class BrowserRecorderService {
  isSupported() {
    return Boolean(
      typeof navigator !== 'undefined' &&
        typeof navigator.mediaDevices?.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined',
    );
  }

  async startRecording(): Promise<StartRecordingResult> {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        ok: false,
        error: createRecorderError('not-supported', 'この環境では録音に対応していない可能性があります。'),
      };
    }

    if (!window.isSecureContext && !isLocalHost()) {
      return {
        ok: false,
        error: createRecorderError('not-secure', '録音にはHTTPSまたはlocalhostでの実行が必要です。'),
      };
    }

    if (!this.isSupported()) {
      return {
        ok: false,
        error: createRecorderError('not-supported', 'この環境では録音に対応していない可能性があります。'),
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getPreferredMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      recorder.start();
      return {
        ok: true,
        session: new BrowserRecorderSession(recorder, stream, Date.now(), mimeType),
      };
    } catch (error) {
      const errorName = error instanceof DOMException ? error.name : '';

      if (errorName === 'NotAllowedError' || errorName === 'SecurityError') {
        return { ok: false, error: createRecorderError('permission-denied') };
      }

      return { ok: false, error: createRecorderError('start-failed') };
    }
  }

  releaseRecording(recording: RecordedAudio | null) {
    if (!recording) {
      return;
    }

    URL.revokeObjectURL(recording.url);
  }
}

export const recorderService = new BrowserRecorderService();
