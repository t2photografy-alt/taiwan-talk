/// <reference types="node" />
import OpenAI from 'openai';

export type GenerateSpeechRequest = {
  text: string;
  language: 'ja-JP' | 'zh-TW';
  voiceStyle: 'natural-soft' | 'natural-calm';
  speedMode: 'normal' | 'slow';
};

export type GenerateSpeechErrorCode =
  | 'disabled'
  | 'invalid-request'
  | 'missing-api-key'
  | 'openai-error'
  | 'rate-limited'
  | 'unknown';

type ApiRequest = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
  send: (body: Buffer) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

type SpeechGenerationInput = {
  model: string;
  input: string;
  voice: string;
  instructions: string;
  responseFormat: 'mp3';
};

export type SpeechGenerator = (input: SpeechGenerationInput) => Promise<Buffer>;

const MAX_TEXT_LENGTH = 500;
const languages: GenerateSpeechRequest['language'][] = ['ja-JP', 'zh-TW'];
const voiceStyles: GenerateSpeechRequest['voiceStyle'][] = ['natural-soft', 'natural-calm'];
const speedModes: GenerateSpeechRequest['speedMode'][] = ['normal', 'slow'];

const instructionsByMode: Record<
  GenerateSpeechRequest['language'],
  Record<GenerateSpeechRequest['speedMode'], string>
> = {
  'ja-JP': {
    normal:
      'Speak in natural conversational Japanese, like a warm and friendly person talking to a friend. Use a relaxed everyday rhythm, gentle intonation, and natural pauses. Do not sound like an announcer, automated navigation, customer support script, textbook recording, or formal narration. Keep the emotional tone appropriate to the sentence without exaggerating it.',
    slow:
      'Speak in natural conversational Japanese, like a warm and friendly person talking to a friend. Speak about 20 to 25 percent slower than normal, but keep the rhythm, intonation, and pauses natural. Do not stretch each syllable unnaturally. Do not sound like an announcer, automated navigation, customer support script, textbook recording, or formal narration.',
  },
  'zh-TW': {
    normal:
      'Speak in natural Taiwan Mandarin with a warm, friendly, everyday conversational tone, as if talking naturally with a friend. Use relaxed rhythm, gentle intonation, and clear pronunciation. Avoid formal newsreader, textbook, customer service, or Mainland-style announcement delivery. Do not overact.',
    slow:
      'Speak in natural Taiwan Mandarin with a warm and friendly conversational tone. Speak about 20 to 25 percent slower than normal while preserving natural rhythm, tones, intonation, and pauses. Do not stretch each character unnaturally. Avoid formal newsreader, textbook, customer service, or announcement delivery.',
  },
};

function errorBody(code: GenerateSpeechErrorCode, message: string) {
  return { ok: false, error: { code, message } };
}

function parseBody(body: unknown) {
  if (typeof body !== 'string') return body;

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function includesValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function validateRequest(body: unknown): GenerateSpeechRequest | null {
  if (typeof body !== 'object' || body === null) return null;

  const candidate = body as Partial<GenerateSpeechRequest>;
  const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
  if (
    !text ||
    text.length > MAX_TEXT_LENGTH ||
    !includesValue(languages, candidate.language) ||
    !includesValue(voiceStyles, candidate.voiceStyle) ||
    !includesValue(speedModes, candidate.speedMode)
  ) {
    return null;
  }

  return {
    text,
    language: candidate.language,
    voiceStyle: candidate.voiceStyle,
    speedMode: candidate.speedMode,
  };
}

function contentType(headers: ApiRequest['headers']) {
  const value = headers?.['content-type'] ?? headers?.['Content-Type'];
  return Array.isArray(value) ? value[0] : value;
}

function voiceForStyle(style: GenerateSpeechRequest['voiceStyle']) {
  return style === 'natural-soft'
    ? process.env.OPENAI_TTS_VOICE_SOFT || 'marin'
    : process.env.OPENAI_TTS_VOICE_CALM || 'cedar';
}

async function openAiSpeechGenerator(input: SpeechGenerationInput) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.audio.speech.create({
    model: input.model,
    input: input.input,
    voice: input.voice as 'marin',
    instructions: input.instructions,
    response_format: input.responseFormat,
  });

  return Buffer.from(await response.arrayBuffer());
}

function classifyError(error: unknown): GenerateSpeechErrorCode {
  const status = (error as { status?: unknown }).status;
  return status === 429 ? 'rate-limited' : 'openai-error';
}

export function createSpeechHandler(generateSpeech: SpeechGenerator = openAiSpeechGenerator) {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json(errorBody('invalid-request', 'POST /api/speech/generate を使ってください。'));
      return;
    }

    if (!contentType(req.headers)?.toLowerCase().startsWith('application/json')) {
      res.status(415).json(errorBody('invalid-request', 'Content-Type は application/json にしてください。'));
      return;
    }

    if (process.env.OPENAI_TTS_ENABLED !== 'true') {
      res.status(503).json(errorBody('disabled', 'AI音声生成は現在無効です。'));
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      res.status(503).json(errorBody('missing-api-key', 'OpenAI API key が設定されていません。'));
      return;
    }

    const request = validateRequest(parseBody(req.body));
    if (!request) {
      res.status(400).json(errorBody('invalid-request', '音声生成リクエストの形式が正しくありません。'));
      return;
    }

    const model = process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts';

    try {
      const audio = await generateSpeech({
        model,
        input: request.text,
        voice: voiceForStyle(request.voiceStyle),
        instructions: instructionsByMode[request.language][request.speedMode],
        responseFormat: 'mp3',
      });

      if (!audio.length) {
        res.status(502).json(errorBody('openai-error', 'AI音声データが空でした。'));
        return;
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Content-Length', String(audio.length));
      res.setHeader('Cache-Control', 'private, no-store');
      res.status(200).send(audio);
    } catch (error) {
      const code = classifyError(error);
      res.status(code === 'rate-limited' ? 429 : 502).json(errorBody(code, 'AI音声の生成に失敗しました。'));
    }
  };
}

export default createSpeechHandler();
