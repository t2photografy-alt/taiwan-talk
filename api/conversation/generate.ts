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
  headers?: Record<string, string | string[] | undefined>;
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
  'pinyin' | 'literalMeaning' | 'nuance' | 'alternatives' | 'naturalnessNote'
> & {
  pinyin: string;
  literalMeaning: string;
  nuance: string | null;
  alternatives: Array<{
    label: string;
    resultText: string;
    pinyin: string | null;
    note: string | null;
  }>;
  naturalnessNote: string | null;
};

type ConversationGeneratorInput = {
  model: string;
  prompt: string;
  request: GenerateConversationRequest;
};

export type ConversationGenerator = (
  input: ConversationGeneratorInput,
) => Promise<ModelConversationResult>;

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
const japaneseLiteralWarningPatterns = [
  /明年も/,
  /少し後で私は/,
  /あなたに送信します/,
  /することができます/,
  /しなければなりません/,
  /してくださいませ/,
];
const chinesePunctuationPattern = /[，：；]/;
const simplifiedChinesePattern = /[这为会发后里么让给说还没过时国门间]/g;
const obviousTaiwanMandarinPattern = /[來喔嗎這給傳謝開個點讓還沒為說]/;

const generationSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'sourceText',
    'resultText',
    'literalMeaning',
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
    literalMeaning: { type: 'string' },
    pinyin: { type: 'string' },
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
    candidate.sourceText.trim().length === 0 ||
    candidate.sourceText.length > 500 ||
    !isLanguage(candidate.sourceLanguage) ||
    !isLanguage(candidate.targetLanguage) ||
    !isTone(candidate.tone)
  ) {
    return null;
  }

  return {
    mode: mode as GenerateConversationRequest['mode'],
    sourceText: candidate.sourceText.trim(),
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
    'targetLanguage が zh-TW の場合、resultText は繁体字の台湾華語にし、pinyin は resultText の読みを声調記号付きで返してください。',
    'targetLanguage が zh-TW の場合、辞書的な逐語訳ではなく、台湾の友達・知人との自然な会話向けにしてください。丁寧すぎず失礼でもない、対面でもSNS/DMでも使いやすい繁体字にしてください。',
    'targetLanguage が ja の場合、resultText は実際に日本人の友達が対面で話す、またはSNS/DMで送る自然な口語日本語にしてください。辞書的な逐語訳、中国語の語順、不要な主語を残さないでください。',
    'targetLanguage が ja かつ tone が friendly の場合は自然な友達口調、polite の場合は柔らかい丁寧語、casual の場合はくだけすぎて失礼にならない口語にしてください。',
    '原文の意図・距離感・感情を変えず、原文より恋愛的に重くしたり、敬語を過剰にしたり、強制的な表現にしないでください。',
    '「〜することができます」「〜してくださいませ」「本日は」「〜しなければなりません」のような機械翻訳的・接客的な日本語を避けてください。',
    'targetLanguage が ja の場合、pinyin は sourceText の台湾華語の読みを声調記号付きで返してください。日本語 resultText に対して pinyin を作らないでください。',
    'resultText: A natural conversational localization that the user can actually say or send.',
    'literalMeaning: A short, natural explanation in the target language that stays closer to the source meaning. It must not preserve unnatural source-language word order or vocabulary. It must not duplicate resultText exactly.',
    'literalMeaning は対象言語で、一文または短い句として書いてください。resultTextより会話的に盛らず、原文にない感情を追加しないでください。',
    'targetLanguage が ja の literalMeaning は、現代の自然な日本語にしてください。日常的な表示では「明年」より「来年」を優先し、中国語由来の語順、不要な代名詞、教科書調・機械翻訳調を避けてください。',
    'targetLanguage が zh-TW の literalMeaning は、自然な繁体字の台湾華語にし、日本語を残さないでください。',
    '会話向けローカライズ例: 下次也一起玩吧～ → 次もまた一緒に遊ぼうね〜 / 謝謝你幫我拍照！ → 写真撮ってくれてありがとう！ / 明年也要來喔！ → 来年も来てね！',
    '会話向けローカライズ例: 等一下我把照片傳給你～ → あとで写真送るね〜 / 今天真的很開心！ → friendlyなら「今日ほんと楽しかった！」、politeなら「今日は本当に楽しかったです！」。',
    'pinyin フィールドは必ず空でない文字列にしてください。sourceLanguage または targetLanguage に zh-TW が含まれるため、台湾華語本文の読みを必ず入れてください。',
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
    literalMeaning: result.literalMeaning.trim(),
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

function hasJapaneseKana(text: string) {
  return /[ぁ-んァ-ン]/.test(text);
}

function hasTraditionalChineseText(text: string) {
  return /[\u3400-\u9fff]/.test(text) && !hasJapaneseKana(text);
}

function hasNaturalJapaneseShape(text: string) {
  return (
    hasJapaneseKana(text) ||
    (!chinesePunctuationPattern.test(text) &&
      !obviousTaiwanMandarinPattern.test(text) &&
      /[\u3400-\u9fff々〆ヶ。！？]/.test(text))
  );
}

function hasObviousChineseArtifactsInJapanese(text: string) {
  const simplifiedMatches = text.match(simplifiedChinesePattern) ?? [];
  return chinesePunctuationPattern.test(text) || simplifiedMatches.length >= 2;
}

function applyLiteralMeaningNotes(
  result: GeneratedConversationResult,
  request: GenerateConversationRequest,
): GeneratedConversationResult {
  if (
    request.targetLanguage !== 'ja' ||
    !japaneseLiteralWarningPatterns.some((pattern) => pattern.test(result.literalMeaning ?? ''))
  ) {
    return result;
  }

  return {
    ...result,
    naturalnessNote: appendNaturalnessNote(
      result.naturalnessNote,
      '原文に近い意味の日本語表現は要レビューです。日常的な語彙と自然な語順を確認してください。',
    ),
  };
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

  if (!result.literalMeaning?.trim()) {
    return 'literalMeaning is empty';
  }

  if (result.literalMeaning.length > 500) {
    return 'literalMeaning is too long';
  }

  if (result.resultText.trim() === result.literalMeaning.trim()) {
    return 'literalMeaning duplicates resultText';
  }

  if (result.targetLanguage !== request.targetLanguage) {
    return 'targetLanguage mismatch';
  }

  if (result.needsNativeCheck !== true || result.reviewStatus !== 'needs-native-check') {
    return 'review status mismatch';
  }

  if (request.targetLanguage === 'ja') {
    if (!hasNaturalJapaneseShape(result.resultText) || !hasNaturalJapaneseShape(result.literalMeaning)) {
      return 'Japanese target text is invalid';
    }
    if (hasObviousChineseArtifactsInJapanese(result.literalMeaning)) {
      return 'literalMeaning contains source-language artifacts';
    }
  }

  if (
    request.targetLanguage === 'zh-TW' &&
    (!hasTraditionalChineseText(result.resultText) || !hasTraditionalChineseText(result.literalMeaning))
  ) {
    return 'Taiwan Mandarin target text is invalid';
  }

  if ((request.targetLanguage === 'zh-TW' || request.sourceLanguage === 'zh-TW') && !result.pinyin?.trim()) {
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

async function generateOpenAiConversation({
  model,
  prompt,
}: ConversationGeneratorInput): Promise<ModelConversationResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content: 'You generate concise JSON for Taiwan Talk. Follow the provided schema exactly.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    max_output_tokens: 1100,
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
    throw new Error('AI generation output was incomplete');
  }

  const outputText = extractOutputText(response);
  if (!outputText) {
    throw new SyntaxError('AI generation output was empty');
  }

  return JSON.parse(outputText) as ModelConversationResult;
}

export function createConversationHandler(
  generateConversation: ConversationGenerator = generateOpenAiConversation,
) {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'POST') {
      res.setHeader?.('Allow', 'POST');
      res.status(405).json(errorResponse('invalid-request', 'POST /api/conversation/generate を使ってください。'));
      return;
    }

    const contentType = req.headers?.['content-type'];
    const normalizedContentType = Array.isArray(contentType) ? contentType[0] : contentType;
    if (!normalizedContentType?.toLowerCase().startsWith('application/json')) {
      res.status(415).json(errorResponse('invalid-request', 'JSON形式のリクエストを送信してください。'));
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

    try {
      const parsed = await generateConversation({
        model,
        prompt: buildPrompt(request),
        request,
      });
      const result = applyLiteralMeaningNotes(
        applyIntentNotes(normalizeResult(parsed, request), request),
        request,
      );
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

      const code = classifyOpenAiError(error);
      res.status(code === 'rate-limited' ? 429 : 502).json(
        errorResponse(code, 'AI生成に失敗しました。'),
      );
    }
  };
}

export default createConversationHandler();
