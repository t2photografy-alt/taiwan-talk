/// <reference types="node" />
import OpenAI from 'openai';
import type {
  GenerateConversationErrorCode,
  GenerateConversationErrorResponse,
  GenerateConversationRequest,
  GenerateConversationResponse,
  GeneratedConversationResult,
} from '../../src/lib/conversation/apiTypes.js';
import type { LanguageCode, PhraseCategory, Tone } from '../../src/lib/conversation/types.js';

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
const DEFAULT_NATURALNESS_NOTE = 'AI生成結果のため、台湾華語表現はネイティブ確認前です。';
const photoIntentPattern = /写真|撮|撮らせ|拍|照/;
const photoResultPattern = /拍|照|照片|相片/;

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

function buildModeInstructions(request: GenerateConversationRequest) {
  if (request.mode === 'compose') {
    return [
      'mode: compose の目的: ユーザーが入力した日本語または台湾華語の意図を、相手に自然に伝わる表現へ整える。',
      'sourceText の会話目的を最優先し、勝手に挨拶、感想、別れの言葉、再会表現へ変えない。',
      'sourceText に「写真」「撮る」「撮らせて」が含まれる場合は、撮影・写真・撮影許可の表現にする。',
      '特に「撮らせてください」は、相手に撮ってもらう依頼ではなく、自分が写真を撮ってよいかの許可表現にする。',
      'sourceText に「写真を送る」「写真を送ります」が含まれる場合は、撮影依頼ではなく写真を送る約束・返信にする。SNS/DM文脈では「傳給你」を優先し、郵送のような寄せ方にしない。',
      'sourceText に「難しい」「次の機会」「断る」が含まれる場合は、やんわり断りつつ次につなげる表現にする。',
      'sourceText に「また会いたい」が含まれる場合は、再会希望の表現にする。',
      'sourceText に「ありがとう」が含まれる場合は、感謝表現にする。',
      'sourceText に「すごい」「かっこいい」「パフォーマンス」が含まれる場合は、褒め言葉にする。',
    ].join('\n');
  }

  if (request.mode === 'message-reply') {
    return [
      'mode: message-reply の目的: 相手のメッセージの意味を踏まえ、replyIntent に合った返信候補を作る。',
      'sourceText と replyIntent の両方を必ず反映する。',
      'replyIntent が「また会いたい」または seeAgain なら、次も会いたい/また一緒に何かしたい表現にする。',
      'replyIntent が「ありがとう」または thanks なら、感謝を返す。',
      'replyIntent が「うれしい」または happy なら、喜びを返す。相手が求めていない追加の約束や申し出を広げすぎない。',
      'replyIntent が「写真を送る」なら、撮影依頼ではなく写真を送る返答にする。SNS/DM文脈では「傳給你」を優先する。',
      'replyIntent が「やんわり断る」なら、短く丁寧に断り、可能なら次回につなげる。',
      '相手の文にない話題を勝手に追加しない。',
    ].join('\n');
  }

  return [
    'mode: quick の目的: 短いフレーズをすぐ見せやすく整える。',
    'なるべく短く、対面で見せやすく、SNS/DMでも送りやすく、sourceText の意図を変えない。',
  ].join('\n');
}

function buildPrompt(request: GenerateConversationRequest) {
  return [
    'あなたは台湾華語と日本語の会話サポートアプリ Taiwan Talk の生成エンジンです。',
    '目的は、翻訳の正確性だけではなく、台湾の友達・知人・パフォーマー・SNS/DM相手と自然にやりとりできる言い方を作ることです。',
    '対面会話、写真のやりとり、SNS/DM、再会時の挨拶、お礼、軽い誘い、返信作成など、複数シーンで使いやすい表現にしてください。',
    'sourceText の主な意図を必ず維持してください。',
    '1生成につき1つの会話意図に絞り、依頼・感謝・断り・再会・返信を混ぜないでください。',
    'sourceText に含まれない別の話題へ飛ばないでください。',
    'resultText と alternatives は、sourceText と同じ会話目的の範囲だけで作ってください。',
    '写真関連では「撮ってほしい」「撮らせてほしい」「写真を送る」を区別してください。',
    '再会挨拶でない入力に、好久不見などの再会表現を返さないでください。',
    'また会いたい表現は友達向けの軽い再会希望にし、恋愛感を強くしすぎないでください。',
    'パフォーマンスや作品の感想は、相手の外見ではなく表演・演出・作品・内容への褒めにしてください。',
    '入力意図が曖昧な場合は、勝手に別シーンへ寄せず、短く自然な確認・返答にしてください。',
    '台湾華語は必ず繁体字で出し、中国大陸向け簡体字にしないでください。',
    '日本語直訳っぽさを減らし、カジュアルすぎて失礼にならない表現にしてください。',
    '政治的表現、国旗、国家論争には寄せないでください。',
    'pinyinは必ずresultTextと対応させ、声調記号付きで出してください。日本語出力の場合はpinyinをnullにしてください。',
    '生成結果は短く、対面でスマホ画面を見せる場合にも、SNS/DMで送る場合にも読みやすくしてください。代替案は最大2件です。',
    "needsNativeCheckは必ずtrue、reviewStatusは必ず'needs-native-check'です。ネイティブ確認済みとは書かないでください。",
    buildModeInstructions(request),
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
    resultText: result.resultText.trim(),
    pinyin: result.pinyin?.trim() || undefined,
    sourceLanguage: isLanguage(result.sourceLanguage) ? result.sourceLanguage : request.sourceLanguage,
    targetLanguage: isLanguage(result.targetLanguage) ? result.targetLanguage : request.targetLanguage,
    tone: isTone(result.tone) ? result.tone : request.tone,
    category: isCategory(result.category) ? result.category : request.category ?? 'other',
    nuance: result.nuance?.trim() || undefined,
    alternatives: result.alternatives.slice(0, 2).map((item) => ({
      label: item.label.trim(),
      resultText: item.resultText.trim(),
      pinyin: item.pinyin?.trim() || undefined,
      note: item.note?.trim() || undefined,
    })),
    readabilityScore:
      typeof result.readabilityScore === 'number'
        ? Math.max(0, Math.min(100, result.readabilityScore))
        : undefined,
    needsNativeCheck: true,
    reviewStatus: 'needs-native-check',
    naturalnessNote:
      result.naturalnessNote?.trim() || DEFAULT_NATURALNESS_NOTE,
  };
}

function appendNaturalnessNote(note: string | undefined, addition: string) {
  if (!note) {
    return addition;
  }

  return note.includes(addition) ? note : `${note} ${addition}`;
}

function applyIntentNotes(
  result: GeneratedConversationResult,
  request: GenerateConversationRequest,
): GeneratedConversationResult {
  if (
    request.targetLanguage === 'zh-TW' &&
    photoIntentPattern.test(request.sourceText) &&
    !photoResultPattern.test(result.resultText)
  ) {
    return {
      ...result,
      naturalnessNote: appendNaturalnessNote(
        result.naturalnessNote,
        '入力意図との一致は要確認です。写真・撮影依頼として自然か確認してください。',
      ),
    };
  }

  return result;
}

function validateGeneratedResult(
  result: GeneratedConversationResult,
  request: GenerateConversationRequest,
): string | null {
  if (!result.resultText.trim()) {
    return 'resultText is empty';
  }

  if (result.targetLanguage !== request.targetLanguage) {
    return 'targetLanguage mismatch';
  }

  if (result.needsNativeCheck !== true || result.reviewStatus !== 'needs-native-check') {
    return 'review status mismatch';
  }

  if (request.targetLanguage === 'zh-TW' && !result.pinyin?.trim()) {
    return 'pinyin is missing';
  }

  if (!isCategory(result.category) || !isTone(result.tone)) {
    return 'category or tone is invalid';
  }

  return null;
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
    const result = applyIntentNotes(normalizeResult(parsed, request), request);
    const invalidReason = validateGeneratedResult(result, request);

    if (invalidReason) {
      res.status(502).json(errorResponse('parse-error', `AI生成結果の検証に失敗しました: ${invalidReason}`));
      return;
    }

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
