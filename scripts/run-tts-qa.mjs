import process from 'node:process';
import { pathToFileURL } from 'node:url';

const baseUrl = process.env.BASE_URL?.replace(/\/$/, '');

const validCases = [
  {
    id: 'JA-SOFT-NORMAL',
    body: {
      text: 'また会えてうれしい！',
      language: 'ja-JP',
      voiceStyle: 'natural-soft',
      speedMode: 'normal',
    },
  },
  {
    id: 'JA-CALM-SLOW',
    body: {
      text: '今日は本当に楽しかったです。',
      language: 'ja-JP',
      voiceStyle: 'natural-calm',
      speedMode: 'slow',
    },
  },
  {
    id: 'ZH-SOFT-NORMAL',
    body: {
      text: '又見到你真的很開心！',
      language: 'zh-TW',
      voiceStyle: 'natural-soft',
      speedMode: 'normal',
    },
  },
  {
    id: 'ZH-CALM-SLOW',
    body: {
      text: '今天也請多多指教。',
      language: 'zh-TW',
      voiceStyle: 'natural-calm',
      speedMode: 'slow',
    },
  },
];

const invalidCases = [
  {
    id: 'INVALID-LANGUAGE',
    body: { text: 'test', language: 'en-US', voiceStyle: 'natural-soft', speedMode: 'normal' },
  },
  {
    id: 'INVALID-VOICE',
    body: { text: 'test', language: 'ja-JP', voiceStyle: 'custom-voice', speedMode: 'normal' },
  },
  {
    id: 'TOO-LONG',
    body: { text: 'あ'.repeat(501), language: 'ja-JP', voiceStyle: 'natural-soft', speedMode: 'normal' },
  },
];

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

async function createLocalCaller() {
  process.env.OPENAI_TTS_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'qa-placeholder-key';
  process.env.OPENAI_TTS_MODEL = 'gpt-4o-mini-tts';
  process.env.OPENAI_TTS_VOICE_SOFT = 'qa-soft-voice';
  process.env.OPENAI_TTS_VOICE_CALM = 'qa-calm-voice';

  const routeUrl = pathToFileURL(`${process.cwd()}/api/speech/generate.ts`).href;
  const { createSpeechHandler } = await import(routeUrl);
  const generationCalls = [];
  const handler = createSpeechHandler(async (input) => {
    generationCalls.push(input);
    return Buffer.alloc(512, 1);
  });

  return {
    generationCalls,
    async call({ method = 'POST', body, contentType = 'application/json' }) {
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
    },
  };
}

async function createProductionCaller() {
  return {
    generationCalls: [],
    async call({ method = 'POST', body, contentType = 'application/json' }) {
      const response = await fetch(`${baseUrl}/api/speech/generate`, {
        method,
        headers: { 'Content-Type': contentType },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
      });
      const responseContentType = response.headers.get('content-type') ?? '';
      const responseBody = responseContentType.startsWith('audio/')
        ? Buffer.from(await response.arrayBuffer())
        : await response.json().catch(() => null);
      return {
        status: response.status,
        headers: new Map([['content-type', responseContentType]]),
        body: responseBody,
      };
    },
  };
}

const caller = baseUrl ? await createProductionCaller() : await createLocalCaller();
const results = [];

for (const testCase of validCases) {
  const response = await caller.call({ body: testCase.body });
  const contentType = String(response.headers.get('content-type') ?? '');
  const size = Buffer.isBuffer(response.body) ? response.body.length : 0;
  const ok = response.status === 200 && contentType.startsWith('audio/') && size > 0;
  results.push({ id: testCase.id, ok, detail: `status=${response.status} type=${contentType} bytes=${size}` });
}

for (const testCase of invalidCases) {
  const response = await caller.call({ body: testCase.body });
  const code = response.body?.error?.code;
  const ok = response.status === 400 && code === 'invalid-request';
  results.push({ id: testCase.id, ok, detail: `status=${response.status} code=${code}` });
}

const getResponse = await caller.call({ method: 'GET' });
results.push({
  id: 'METHOD-NOT-ALLOWED',
  ok: getResponse.status === 405 && getResponse.body?.error?.code === 'invalid-request',
  detail: `status=${getResponse.status}`,
});

const nonJsonResponse = await caller.call({ body: validCases[0].body, contentType: 'text/plain' });
results.push({
  id: 'CONTENT-TYPE',
  ok: nonJsonResponse.status === 415 && nonJsonResponse.body?.error?.code === 'invalid-request',
  detail: `status=${nonJsonResponse.status}`,
});

if (!baseUrl) {
  const [jaSoft, jaCalm, zhSoft, zhCalm] = caller.generationCalls;
  results.push({
    id: 'VOICE-MAPPING',
    ok:
      jaSoft?.voice === 'qa-soft-voice' &&
      jaCalm?.voice === 'qa-calm-voice' &&
      zhSoft?.voice === 'qa-soft-voice' &&
      zhCalm?.voice === 'qa-calm-voice' &&
      jaSoft.voice !== jaCalm.voice,
    detail: `soft=${jaSoft?.voice} calm=${jaCalm?.voice}`,
  });
  results.push({
    id: 'SLOW-INSTRUCTIONS',
    ok:
      jaCalm?.instructions.includes('20 to 25 percent slower') &&
      zhCalm?.instructions.includes('20 to 25 percent slower'),
    detail: 'slow mode keeps server-controlled conversational instructions',
  });
}

for (const result of results) {
  console.log(`${result.ok ? 'OK' : 'FAIL'} ${result.id} ${result.detail}`);
}

const failures = results.filter((result) => !result.ok);
console.log(`\nTTS QA: Total=${results.length} Failed=${failures.length} Mode=${baseUrl ? 'production' : 'local-handler'}`);
if (failures.length) process.exit(1);
