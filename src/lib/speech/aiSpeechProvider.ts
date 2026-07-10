import type { TtsLanguage, TtsSpeedMode, TtsVoiceStyle } from './types';

export type AiSpeechRequest = {
  text: string;
  language: TtsLanguage;
  voiceStyle: TtsVoiceStyle;
  speedMode: TtsSpeedMode;
};

const MAX_CACHE_ENTRIES = 30;

function cacheKey(request: AiSpeechRequest) {
  return JSON.stringify([
    request.text,
    request.language,
    request.voiceStyle,
    request.speedMode,
  ]);
}

class AiSpeechProvider {
  private readonly cache = new Map<string, Blob>();

  private readCached(key: string) {
    const blob = this.cache.get(key);
    if (!blob) return undefined;

    this.cache.delete(key);
    this.cache.set(key, blob);
    return blob;
  }

  private writeCached(key: string, blob: Blob) {
    this.cache.set(key, blob);
    if (this.cache.size <= MAX_CACHE_ENTRIES) return;

    const oldestKey = this.cache.keys().next().value as string | undefined;
    if (oldestKey) this.cache.delete(oldestKey);
  }

  async generate(request: AiSpeechRequest, signal: AbortSignal) {
    const key = cacheKey(request);
    const cached = this.readCached(key);
    if (cached) return cached;

    const response = await fetch('/api/speech/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(payload?.error?.message || 'AI音声を生成できませんでした。');
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.toLowerCase().startsWith('audio/')) {
      throw new Error('AI音声の応答形式が正しくありません。');
    }

    const blob = await response.blob();
    if (blob.size === 0) throw new Error('AI音声データが空でした。');

    this.writeCached(key, blob);
    return blob;
  }
}

export const aiSpeechProvider = new AiSpeechProvider();
