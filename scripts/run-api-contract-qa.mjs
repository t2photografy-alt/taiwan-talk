import process from 'node:process';
import { pathToFileURL } from 'node:url';

const secret = 'qa-contract-secret-key';
process.env.AI_GENERATION_ENABLED = 'true';
process.env.OPENAI_API_KEY = secret;
process.env.OPENAI_MODEL = 'qa-conversation-model';
process.env.OPENAI_TTS_ENABLED = 'true';
process.env.OPENAI_TTS_MODEL = 'qa-tts-model';
process.env.OPENAI_TTS_VOICE_SOFT = 'qa-soft-voice';
process.env.OPENAI_TTS_VOICE_CALM = 'qa-calm-voice';

const conversationModule = await import(
  pathToFileURL(`${process.cwd()}/api/conversation/generate.ts`).href
);
const speechModule = await import(pathToFileURL(`${process.cwd()}/api/speech/generate.ts`).href);

function createMockResponse() {
  const headers = new Map();
  const result = { status: 200, headers, body: undefined };
  const response = {
    status(code) {
      result.status = code;
      return response;
    },
    json(body) {
      result.body = body;
      headers.set('content-type', 'application/json');
    },
    send(body) {
      result.body = body;
    },
    setHeader(name, value) {
      headers.set(name.toLowerCase(), Array.isArray(value) ? value.join(', ') : value);
    },
  };

  return { response, result };
}

async function invoke(handler, { method = 'POST', body, contentType = 'application/json' } = {}) {
  const { response, result } = createMockResponse();
  await handler(
    {
      method,
      headers: { 'content-type': contentType },
      body,
    },
    response,
  );
  return result;
}

const checks = [];
function check(group, name, condition, detail = '') {
  checks.push({ group, name, ok: Boolean(condition), detail });
}

const conversationCalls = [];
const conversationHandler = conversationModule.createConversationHandler(async (input) => {
  conversationCalls.push(input);
  const toJapanese = input.request.targetLanguage === 'ja';
  return {
    sourceText: input.request.sourceText,
    resultText: toJapanese ? '来年も来てね！' : '明年也要再來喔！',
    literalMeaning: toJapanese ? '来年も来てくださいね。' : '明年也會再來。',
    pinyin: 'míng nián yě yào lái o',
    sourceLanguage: input.request.sourceLanguage,
    targetLanguage: input.request.targetLanguage,
    tone: input.request.tone,
    category: input.request.category ?? 'other',
    nuance: '友達向けの自然な会話文です。',
    alternatives: [],
    readabilityScore: 88,
    needsNativeCheck: true,
    reviewStatus: 'needs-native-check',
    naturalnessNote: 'ネイティブ確認前です。',
  };
});

const validConversation = {
  mode: 'compose',
  sourceText: '明年也要來喔！',
  sourceLanguage: 'zh-TW',
  targetLanguage: 'ja',
  tone: 'friendly',
  category: 'seeAgain',
};

const conversationMethod = await invoke(conversationHandler, { method: 'GET' });
check('conversation', 'POST以外を拒否', conversationMethod.status === 405);

const conversationContentType = await invoke(conversationHandler, {
  body: validConversation,
  contentType: 'text/plain',
});
check('conversation', 'JSON以外を拒否', conversationContentType.status === 415);

const emptySource = await invoke(conversationHandler, {
  body: { ...validConversation, sourceText: '   ' },
});
check('conversation', '空sourceTextを拒否', emptySource.status === 400);

const invalidSourceLanguage = await invoke(conversationHandler, {
  body: { ...validConversation, sourceLanguage: 'en' },
});
check('conversation', '不正sourceLanguageを拒否', invalidSourceLanguage.status === 400);

const invalidTargetLanguage = await invoke(conversationHandler, {
  body: { ...validConversation, targetLanguage: 'en' },
});
check('conversation', '不正targetLanguageを拒否', invalidTargetLanguage.status === 400);

const validConversationResponse = await invoke(conversationHandler, { body: validConversation });
const generated = validConversationResponse.body?.result ?? {};
check('conversation', '正常response', validConversationResponse.status === 200 && validConversationResponse.body?.ok === true);
check('conversation', 'needsNativeCheck=true', generated.needsNativeCheck === true);
check('conversation', 'reviewStatus維持', generated.reviewStatus === 'needs-native-check');
check('conversation', '日本語resultText', /[ぁ-んァ-ン]/.test(String(generated.resultText ?? '')));
check('conversation', '台湾華語本文用pinyin', /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(String(generated.pinyin ?? '')));
check('conversation', 'literalMeaningは対象言語', /[ぁ-んァ-ン]/.test(String(generated.literalMeaning ?? '')));
check(
  'conversation',
  'literalMeaningはresultTextと別',
  String(generated.literalMeaning ?? '').trim() !== String(generated.resultText ?? '').trim(),
);
check(
  'conversation',
  'API key非露出',
  !JSON.stringify(validConversationResponse.body).includes(secret),
);

const chineseConversationResponse = await invoke(conversationHandler, {
  body: {
    ...validConversation,
    sourceText: '来年も来てくださいね',
    sourceLanguage: 'ja',
    targetLanguage: 'zh-TW',
  },
});
check('conversation', '台湾華語resultText', /[\u3400-\u9fff]/.test(String(chineseConversationResponse.body?.result?.resultText ?? '')));
check(
  'conversation',
  '台湾華語literalMeaning',
  /[\u3400-\u9fff]/.test(String(chineseConversationResponse.body?.result?.literalMeaning ?? '')) &&
    !/[ぁ-んァ-ン]/.test(String(chineseConversationResponse.body?.result?.literalMeaning ?? '')),
);

const duplicateLiteralHandler = conversationModule.createConversationHandler(async (input) => ({
  sourceText: input.request.sourceText,
  resultText: '来年も来てね！',
  literalMeaning: '来年も来てね！',
  pinyin: 'míng nián yě yào lái o',
  sourceLanguage: input.request.sourceLanguage,
  targetLanguage: input.request.targetLanguage,
  tone: input.request.tone,
  category: input.request.category ?? 'other',
  nuance: null,
  alternatives: [],
  readabilityScore: 80,
  needsNativeCheck: true,
  reviewStatus: 'needs-native-check',
  naturalnessNote: null,
}));
const duplicateLiteral = await invoke(duplicateLiteralHandler, { body: validConversation });
check('conversation', 'literalMeaning完全一致を拒否', duplicateLiteral.status === 502);

const speechCalls = [];
const speechHandler = speechModule.createSpeechHandler(async (input) => {
  speechCalls.push(input);
  return Buffer.alloc(256, 7);
});
const validSpeech = {
  text: 'また会えてうれしい！',
  language: 'ja-JP',
  voiceStyle: 'natural-soft',
  speedMode: 'normal',
};

const speechMethod = await invoke(speechHandler, { method: 'GET' });
check('speech', 'POST以外を拒否', speechMethod.status === 405);

const speechContentType = await invoke(speechHandler, {
  body: validSpeech,
  contentType: 'text/plain',
});
check('speech', 'JSON以外を拒否', speechContentType.status === 415);

for (const [name, body] of [
  ['空textを拒否', { ...validSpeech, text: ' ' }],
  ['500文字超過を拒否', { ...validSpeech, text: 'あ'.repeat(501) }],
  ['不正languageを拒否', { ...validSpeech, language: 'en-US' }],
  ['不正voiceStyleを拒否', { ...validSpeech, voiceStyle: 'custom' }],
  ['不正speedModeを拒否', { ...validSpeech, speedMode: 'fast' }],
]) {
  const response = await invoke(speechHandler, { body });
  check('speech', name, response.status === 400);
}

const softNormal = await invoke(speechHandler, { body: validSpeech });
const calmSlow = await invoke(speechHandler, {
  body: { ...validSpeech, voiceStyle: 'natural-calm', speedMode: 'slow' },
});
check(
  'speech',
  '正常responseは音声',
  softNormal.status === 200 && String(softNormal.headers.get('content-type')).startsWith('audio/'),
);
check('speech', '音声bodyが空でない', Buffer.isBuffer(softNormal.body) && softNormal.body.length > 0);
check('speech', 'API key非露出', !String(softNormal.body).includes(secret));
check(
  'speech',
  'soft/calm voice mapping',
  speechCalls[0]?.voice === 'qa-soft-voice' &&
    speechCalls[1]?.voice === 'qa-calm-voice' &&
    speechCalls[0]?.voice !== speechCalls[1]?.voice,
);
check(
  'speech',
  'normal/slow instructions差分',
  speechCalls[0]?.instructions !== speechCalls[1]?.instructions &&
    speechCalls[1]?.instructions.includes('20 to 25 percent slower'),
);
check('speech', 'calm slowも成功', calmSlow.status === 200);

for (const item of checks) {
  console.log(`${item.ok ? 'OK' : 'FAIL'} [${item.group}] ${item.name}${item.detail ? ` ${item.detail}` : ''}`);
}

const failures = checks.filter((item) => !item.ok);
console.log(`\nAPI contract QA: Total=${checks.length} Failed=${failures.length}`);
console.log(`Conversation generator calls=${conversationCalls.length} Speech generator calls=${speechCalls.length}`);
if (failures.length > 0) process.exit(1);
