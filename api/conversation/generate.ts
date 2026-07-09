import OpenAI from 'openai';
import type {
  GenerateConversationErrorCode,
  GenerateConversationErrorResponse,
  GenerateConversationRequest,
  GenerateConversationResponse,
  GeneratedConversationResult,
} from '../../src/lib/conversation/apiTypes';
import type { LanguageCode, PhraseCategory, Tone } from '../../src/lib/conversation/types';

type ApiRequest = {
  method?: string;
  body?: unknown;
};

type ApiResponse = {
  status: (code: number) => {
    json: (body: GenerateConversationResponse | GenerateConversationErrorResponse) => void;
  };
  setHeader?: (name: string, value: string | string[]) => void;
};

type ModelConversationResult = Omit<
  GeneratedConversationResult,
  'pinyin' | 'nuance' | 'alternatives' | 'naturalnessNote'
> & {
  pinyin: string | null;
  nuance: string | null;
  alternatives: Array<{
    label: string;
    resultText: string;
    pinyin: string | null;
    note: string | null;
  }>;
  naturalnessNote: string | null;
};

const DEFAULT_MODEL = 'gpt-4.1-mini';
const tones: Tone[] = ['friendly', 'polite', 'casual', 'event', 'dm'];
const categories: PhraseCategory[] = [
  'greeting',
  'thanks',
  'photo',
  'event',
  'oshi',
  'dm',
  'seeAgain',
  'other',
];
const languages: LanguageCode[] = ['ja', 'zh-TW'];

const generationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'sourceText',
    'resultText',
    'pinyin',
    'sourceLanguage',
    'targetLanguage',
    'tone',
    'category',
    'nuance',
    'alternatives',
    'readabilityScore',
    'needsNativeCheck',
    'reviewStatus',
    'naturalnessNote',
  ],
  properties: {
    sourceText: { type: 'string' },
    resultText: { type: 'string' },
    pinyin: { type: ['string', 'null'] },
    sourceLanguage: { type: 'string', enum: languages },
    targetLanguage: { type: 'string', enum: languages },
    tone: { type: 'string', enum: tones },
    category: { type: 'string', enum: categories },
    nuance: { type: ['string', 'null'] },
    alternatives: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'resultText', 'pinyin', 'note'],
        properties: {
          label: { type: 'string' },
          resultText: { type: 'string' },
          pinyin: { type: ['string', 'null'] },
          note: { type: ['string', 'null'] },
        },
      },
    },
    readabilityScore: { type: 'number', minimum: 0, maximum: 100 },
    needsNativeCheck: { type: 'boolean', enum: [true] },
    reviewStatus: { type: 'string', enum: ['needs-native-check'] },
    naturalnessNote: { type: ['string', 'null'] },
  },
} as const;

function errorResponse(
  code: GenerateConversationErrorCode,
  message: string,
): GenerateConversationErrorResponse {
  return {
    ok: false,
    error: {
      code,
      message,
    },
  };
}

function parseBody(body: unknown) {
  if (typeof body !== 'string') {
    return body;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function isLanguage(value: unknown): value is LanguageCode {
  return typeof value === 'string' && languages.includes(value as LanguageCode);
}

function isTone(value: unknown): value is Tone {
  return typeof value === 'string' && tones.includes(value as Tone);
}

function isCategory(value: unknown): value is PhraseCategory {
  return typeof value === 'string' && categories.includes(value as PhraseCategory);
}

function validateRequest(body: unknown): GenerateConversationRequest | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const candidate = body as Partial<GenerateConversationRequest>;
  const mode = candidate.mode;

  if (
    !['quick', 'compose', 'message-reply'].includes(String(mode)) ||
    typeof candidate.sourceText !== 'string' ||
    !isLanguage(candidate.sourceLanguage) ||
    !isLanguage(candidate.targetLanguage) ||
    !isTone(candidate.tone)
  ) {
    return null;
  }

  return {
    mode: mode as GenerateConversationRequest['mode'],
    sourceText: candidate.sourceText.slice(0, 500),
    sourceLanguage: candidate.sourceLanguage,
    targetLanguage: candidate.targetLanguage,
    tone: candidate.tone,
    category: isCategory(candidate.category) ? candidate.category : 'other',
    purpose: typeof candidate.purpose === 'string' ? candidate.purpose.slice(0, 240) : undefined,
    relationship:
      typeof candidate.relationship === 'string' ? candidate.relationship.slice(0, 160) : undefined,
    replyIntent:
      typeof candidate.replyIntent === 'string' ? candidate.replyIntent.slice(0, 80) : undefined,
  };
}

function buildPrompt(request: GenerateConversationRequest) {
  return [
    'あなたは台湾華語と日本語の会話サポートアプリ Taiwan Talk の生成エンジンです。',
    '目的は、翻訳の正確性だけではなく、友達・イベント・DMでスマホ画面を見せやすい自然な言い方を作ることです。',
    '台湾華語は必ず繁体字で出し、中国大陸向け簡体字にしないでください。',
    '日本語直訳っぽさを減らし、カジュアルすぎて失礼にならない表現にしてください。',
    '政治的表現、国旗、国家論争には寄せないでください。',
    'pinyinは声調記号付きで出してください。日本語出力の場合はpinyinをnullにしてください。',
    '生成結果は短く、スマホ画面で読みやすくしてください。代替案は最大2件です。',
    "needsNativeCheckは必ずtrue、reviewStatusは必ず'needs-native-check'です。ネイティブ確認済みとは書かないでください。",
    `入力JSON: ${JSON.stringify(request)}`,
  ].join('\n');
}

function extractOutputText(response: unknown) {
  const directText = (response as { output_text?: unknown }).output_text;
  if (typeof directText === 'string' && directText.trim()) {
    return directText;
  }

  const output = (response as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return '';
  }

  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      if ((part as { type?: unknown }).type === 'output_text') {
        const text = (part as { text?: unknown }).text;
        if (typeof text === 'string') {
          return text;
        }
      }
    }
  }

  return '';
}

function normalizeResult(result: ModelConversationResult, request: GenerateConversationRequest): GeneratedConversationResult {
  return {
    sourceText: result.sourceText || request.sourceText,
    resultText: result.resultText,
    pinyin: result.pinyin ?? undefined,
    sourceLanguage: isLanguage(result.sourceLanguage) ? result.sourceLanguage : request.sourceLanguage,
    targetLanguage: isLanguage(result.targetLanguage) ? result.targetLanguage : request.targetLanguage,
    tone: isTone(result.tone) ? result.tone : request.tone,
    category: isCategory(result.category) ? result.category : request.category ?? 'other',
    nuance: result.nuance ?? undefined,
    alternatives: result.alternatives.slice(0, 2).map((item) => ({
      label: item.label,
      resultText: item.resultText,
      pinyin: item.pinyin ?? undefined,
      note: item.note ?? undefined,
    })),
    readabilityScore:
      typeof result.readabilityScore === 'number'
        ? Math.max(0, Math.min(100, result.readabilityScore))
        : undefined,
    needsNativeCheck: true,
    reviewStatus: 'needs-native-check',
    naturalnessNote:
      result.naturalnessNote ?? 'AI生成結果のため、台湾華語表現はネイティブ確認前です。',
  };
}

function classifyOpenAiError(error: unknown): GenerateConversationErrorCode {
  const status = (error as { status?: unknown }).status;
  return status === 429 ? 'rate-limited' : 'openai-error';
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST');
    res.status(405).json(errorResponse('invalid-request', 'POST /api/conversation/generate を使ってください。'));
    return;
  }

  if (process.env.AI_GENERATION_ENABLED !== 'true') {
    res.status(503).json(errorResponse('disabled', 'AI生成は現在無効です。'));
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json(errorResponse('missing-api-key', 'OpenAI API key が設定されていません。'));
    return;
  }

  const request = validateRequest(parseBody(req.body));
  if (!request) {
    res.status(400).json(errorResponse('invalid-request', '生成リクエストの形式が正しくありません。'));
    return;
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const response = await client.responses.create({
      model,
      input: [
        {
          role: 'system',
          content: 'You generate concise JSON for Taiwan Talk. Follow the provided schema exactly.',
        },
        {
          role: 'user',
          content: buildPrompt(request),
        },
      ],
      max_output_tokens: 900,
      text: {
        format: {
          type: 'json_schema',
          name: 'taiwan_talk_conversation_result',
          schema: generationSchema,
          strict: true,
        },
      },
    });

    if (
      (response as { status?: unknown }).status === 'incomplete' &&
      (response as { incomplete_details?: { reason?: unknown } }).incomplete_details?.reason ===
        'max_output_tokens'
    ) {
      res.status(502).json(errorResponse('openai-error', 'AI生成結果が途中で切れました。'));
      return;
    }

    const outputText = extractOutputText(response);
    if (!outputText) {
      res.status(502).json(errorResponse('parse-error', 'AI生成結果を読み取れませんでした。'));
      return;
    }

    const parsed = JSON.parse(outputText) as ModelConversationResult;
    const result = normalizeResult(parsed, request);

    res.status(200).json({
      ok: true,
      result,
      meta: {
        provider: 'openai',
        model,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      res.status(502).json(errorResponse('parse-error', 'AI生成結果のJSON解析に失敗しました。'));
      return;
    }

    res.status(classifyOpenAiError(error) === 'rate-limited' ? 429 : 502).json(
      errorResponse(classifyOpenAiError(error), 'AI生成に失敗しました。'),
    );
  }
}
