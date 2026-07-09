import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_BASE_URL = 'http://127.0.0.1:5173';
const baseUrl = (process.env.BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
const hasExplicitBaseUrl = Boolean(process.env.BASE_URL);
const outputDir = path.join(process.cwd(), 'outputs', 'ai-generation-qa');
const outputPath = path.join(outputDir, 'latest.md');

const cases = [
  {
    id: 'C01',
    title: '写真許可',
    request: {
      mode: 'compose',
      sourceText: 'また写真撮らせてください！',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'photo',
    },
    expected: '写真/撮影許可の意図を維持し、再会挨拶へ飛ばない。',
    intentKeywords: ['拍', '照', '照片', '相片'],
    forbiddenKeywords: ['好久不見', '幫我拍'],
  },
  {
    id: 'C02',
    title: '一緒に写真',
    request: {
      mode: 'compose',
      sourceText: '一緒に写真撮れたら嬉しいです',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'polite',
      category: 'photo',
    },
    expected: '一緒に写真を撮る依頼。丁寧すぎず、失礼でない。',
    intentKeywords: ['一起', '拍', '照', '照片', '相片'],
    forbiddenKeywords: ['好久不見'],
  },
  {
    id: 'C03',
    title: 'パフォーマンスを褒める',
    request: {
      mode: 'compose',
      sourceText: '今日のパフォーマンス本当に最高でした！',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'event',
      category: 'event',
    },
    expected: '表演/演出/精彩/太棒のような褒め表現。相手の性別に寄りすぎない。',
    intentKeywords: ['表演', '演出', '精彩', '太棒', '厲害'],
    forbiddenKeywords: ['漂亮女生', '帥哥'],
  },
  {
    id: 'C04',
    title: 'また会いたい',
    request: {
      mode: 'compose',
      sourceText: 'また来年も会いたいです',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'seeAgain',
    },
    expected: 'また会いたい/次も会いたい。過度に恋愛っぽくしない。',
    intentKeywords: ['再', '見', '明年', '下次'],
    forbiddenKeywords: ['愛你', '想你想到'],
  },
  {
    id: 'C05',
    title: 'お礼',
    request: {
      mode: 'compose',
      sourceText: '写真を撮らせてくれてありがとう！',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'thanks',
    },
    expected: '写真を撮らせてくれたことへの感謝。写真依頼ではなく、感謝になっている。',
    intentKeywords: ['謝謝', '感謝', '拍照', '照片'],
    forbiddenKeywords: ['可以拍', '可以跟你拍'],
  },
  {
    id: 'C06',
    title: '台湾華語を勉強中',
    request: {
      mode: 'compose',
      sourceText: '台湾華語を少し勉強しています',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'greeting',
    },
    expected: '中文/台灣華語など自然な言い方。自己紹介として自然。',
    intentKeywords: ['中文', '台灣華語', '學', '學習'],
    forbiddenKeywords: ['好久不見'],
  },
  {
    id: 'C07',
    title: 'やんわり断る',
    request: {
      mode: 'compose',
      sourceText: '今日は少し難しいですが、また次の機会にお願いします',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'polite',
      category: 'dm',
    },
    expected: 'やんわり断る。失礼にならず、次回につなげる。DMでも対面でも使いやすい。',
    intentKeywords: ['不好意思', '抱歉', '今天', '下次', '機會', '改天', '有點難'],
    forbiddenKeywords: ['不想', '不要', '拒絕'],
  },
  {
    id: 'C08',
    title: '写真を送る',
    request: {
      mode: 'compose',
      sourceText: 'あとで写真を送りますね！',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'photo',
    },
    expected: '後で写真を送る約束。撮影依頼と混同せず、DMでも対面でも使いやすい。',
    intentKeywords: ['照片', '傳', '發', '送', '給你', '等一下', '晚點'],
    forbiddenKeywords: ['幫我拍', '可以拍', '可以跟你拍'],
  },
  {
    id: 'C09',
    title: '日本語は少し話せますか',
    request: {
      mode: 'compose',
      sourceText: '日本語は少し話せますか？',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: 'polite',
      category: 'greeting',
    },
    expected: '相手に日本語が話せるか丁寧に聞く。失礼になりにくく、対面会話の入口として自然。',
    intentKeywords: ['日文', '日語', '日本語', '會說', '會講'],
    forbiddenKeywords: ['我會說', '我在學'],
  },
  {
    id: 'ZH01',
    title: '台湾華語を日本語へ',
    request: {
      mode: 'compose',
      sourceText: '下次也一起玩吧～',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'ja',
      tone: 'friendly',
      category: 'seeAgain',
    },
    expected: 'resultText は自然な日本語。pinyin は sourceText の台湾華語読み。',
    intentKeywords: ['次', 'また', '一緒', '遊'],
    forbiddenKeywords: ['好久不見', '愛して'],
  },
  {
    id: 'ZH02',
    title: '写真メッセージを日本語へ',
    request: {
      mode: 'compose',
      sourceText: '等一下我把照片傳給你～',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'ja',
      tone: 'friendly',
      category: 'photo',
    },
    expected: 'resultText は自然な日本語で、写真をあとで送るニュアンス。pinyin は sourceText の台湾華語読み。',
    intentKeywords: ['写真', '送', 'あと', '後'],
    forbiddenKeywords: ['撮らせ', '撮って'],
  },
  {
    id: 'M01',
    title: 'また遊ぼう',
    request: {
      mode: 'message-reply',
      sourceText: '下次也一起玩吧～',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'dm',
      replyIntent: 'また会いたい',
    },
    expected: 'また会いたい/次も一緒に何かしたい返信。無関係な写真依頼に飛ばない。',
    intentKeywords: ['下次', '再', '一起', '見', '玩'],
    forbiddenKeywords: ['拍照', '照片'],
  },
  {
    id: 'M02',
    title: '写真ありがとう',
    request: {
      mode: 'message-reply',
      sourceText: '謝謝你幫我拍照！',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'dm',
      replyIntent: 'うれしい',
    },
    expected: '喜び、こちらこそ、また撮りたい等。感謝に自然に返す。',
    intentKeywords: ['開心', '謝謝', '拍', '照', '照片'],
    forbiddenKeywords: ['好久不見'],
  },
  {
    id: 'M03',
    title: 'また来てね',
    request: {
      mode: 'message-reply',
      sourceText: '明年也要來喔！',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'dm',
      replyIntent: 'また会いたい',
    },
    expected: '来年も行きたい/また会いたい。短く自然。',
    intentKeywords: ['明年', '再', '見', '一定', '去'],
    forbiddenKeywords: ['拍照'],
  },
  {
    id: 'M04',
    title: '写真送る',
    request: {
      mode: 'message-reply',
      sourceText: '可以傳照片給我嗎？',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'zh-TW',
      tone: 'friendly',
      category: 'dm',
      replyIntent: '写真を送る',
    },
    expected: '写真を送る返答。等一下/我傳給你/沒問題などの方向性。',
    intentKeywords: ['照片', '傳', '等一下', '沒問題', '給你'],
    forbiddenKeywords: ['好久不見'],
  },
  {
    id: 'M05',
    title: 'やんわり断る返信',
    request: {
      mode: 'message-reply',
      sourceText: '今天晚上一起去吃飯嗎？',
      sourceLanguage: 'zh-TW',
      targetLanguage: 'zh-TW',
      tone: 'polite',
      category: 'dm',
      replyIntent: 'やんわり断る',
    },
    expected: '丁寧に断る。申し訳なさと次回につなげるニュアンス。きつい拒否にしない。',
    intentKeywords: ['不好意思', '抱歉', '今天', '下次', '改天', '有機會', '沒辦法'],
    forbiddenKeywords: ['不想', '不要', '拒絕'],
  },
];

const mockResults = {
  C01: ['可以再讓我拍照嗎？', 'kě yǐ zài ràng wǒ pāi zhào ma'],
  C02: ['如果可以一起拍照，我會很開心。', 'rú guǒ kě yǐ yì qǐ pāi zhào, wǒ huì hěn kāi xīn'],
  C03: ['今天的表演真的太棒了！', 'jīn tiān de biǎo yǎn zhēn de tài bàng le'],
  C04: ['明年也想再見到你！', 'míng nián yě xiǎng zài jiàn dào nǐ'],
  C05: ['謝謝你讓我拍照！', 'xiè xie nǐ ràng wǒ pāi zhào'],
  C06: ['我正在學一點台灣華語。', 'wǒ zhèng zài xué yì diǎn tái wān huá yǔ'],
  C07: ['不好意思，今天有點難，下次有機會再麻煩你。', 'bù hǎo yì si, jīn tiān yǒu diǎn nán, xià cì yǒu jī huì zài má fán nǐ'],
  C08: ['我晚點把照片傳給你！', 'wǒ wǎn diǎn bǎ zhào piàn chuán gěi nǐ'],
  C09: ['請問你會說一點日文嗎？', 'qǐng wèn nǐ huì shuō yì diǎn rì wén ma'],
  ZH01: ['次もまた一緒に遊ぼうね〜', 'xià cì yě yì qǐ wán ba'],
  ZH02: ['あとで写真を送るね〜', 'děng yí xià wǒ bǎ zhào piàn chuán gěi nǐ'],
  M01: ['好啊，下次再一起玩！', 'hǎo a, xià cì zài yì qǐ wán'],
  M02: ['我也很開心，謝謝你讓我拍照！', 'wǒ yě hěn kāi xīn, xiè xie nǐ ràng wǒ pāi zhào'],
  M03: ['一定會，明年也想再見到你！', 'yí dìng huì, míng nián yě xiǎng zài jiàn dào nǐ'],
  M04: ['沒問題，我等一下傳照片給你！', 'méi wèn tí, wǒ děng yí xià chuán zhào piàn gěi nǐ'],
  M05: ['不好意思，今天晚上我有點不方便，下次有機會再一起吃飯。', 'bù hǎo yì si, jīn tiān wǎn shàng wǒ yǒu diǎn bù fāng biàn, xià cì yǒu jī huì zài yì qǐ chī fàn'],
};

function createMockResponse(testCase, reason) {
  const [resultText, pinyin] = mockResults[testCase.id] ?? ['好啊！', 'hǎo a'];

  return {
    ok: true,
    result: {
      sourceText: testCase.request.sourceText,
      resultText,
      pinyin,
      sourceLanguage: testCase.request.sourceLanguage,
      targetLanguage: testCase.request.targetLanguage,
      tone: testCase.request.tone,
      category: testCase.request.category ?? 'other',
      nuance: `Mock fallback used for QA sampling: ${reason}`,
      alternatives: [],
      readabilityScore: 80,
      needsNativeCheck: true,
      reviewStatus: 'needs-native-check',
      naturalnessNote: 'mock生成結果です。台湾華語表現はネイティブ確認前です。',
    },
    meta: {
      provider: 'mock',
      generatedAt: new Date().toISOString(),
    },
  };
}

function includesAny(text, words) {
  return words.some((word) => text.includes(word));
}

function isTraditionalChineseLikely(text) {
  return /[\u3400-\u9fff]/.test(text) && !/[ぁ-んァ-ン]/.test(text);
}

function isJapaneseLikely(text) {
  return /[ぁ-んァ-ン]/.test(text);
}

function hasToneMarkedPinyin(text) {
  return /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]/i.test(text);
}

function evaluateResult(testCase, payload, httpStatus) {
  const result = payload.result ?? {};
  const resultText = String(result.resultText ?? '');
  const pinyin = String(result.pinyin ?? '');
  const checks = [];

  const add = (label, ok, severity = 'fail') => {
    checks.push({ label, ok, severity });
  };

  add('HTTP status is not 500', httpStatus < 500);
  add('ok true', payload.ok === true);
  add('resultText not empty', resultText.trim().length > 0);
  if (testCase.request.targetLanguage === 'ja') {
    add('Japanese result likely', isJapaneseLikely(resultText));
  } else {
    add('Traditional Chinese likely', isTraditionalChineseLikely(resultText), 'warn');
  }
  add('pinyin exists', pinyin.trim().length > 0);
  add('pinyin has tone marks', hasToneMarkedPinyin(pinyin), 'warn');
  add('needsNativeCheck true', result.needsNativeCheck === true);
  add('reviewStatus needs-native-check', result.reviewStatus === 'needs-native-check');
  add('meta.provider exists', typeof payload.meta?.provider === 'string');
  add('meta.generatedAt exists', typeof payload.meta?.generatedAt === 'string');
  add('intent keyword found', includesAny(resultText, testCase.intentKeywords), 'warn');
  add('no obvious unrelated phrase', !includesAny(resultText, testCase.forbiddenKeywords), 'warn');

  const failed = checks.filter((check) => !check.ok && check.severity === 'fail');
  const warnings = checks.filter((check) => !check.ok && check.severity === 'warn');

  return {
    checks,
    failed,
    warnings,
  };
}

async function callApi(testCase) {
  const url = `${baseUrl}/api/conversation/generate`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testCase.request),
    });
    const body = await response.json().catch(async () => ({
      ok: false,
      error: {
        code: 'parse-error',
        message: await response.text().catch(() => 'Failed to read response'),
      },
    }));

    if (
      response.status === 503 &&
      body?.error &&
      ['disabled', 'missing-api-key'].includes(body.error.code)
    ) {
      return {
        status: 200,
        payload: createMockResponse(testCase, body.error.code),
        source: 'mock-fallback',
      };
    }

    return {
      status: response.status,
      payload: body,
      source: 'api',
    };
  } catch (error) {
    if (!hasExplicitBaseUrl) {
      return {
        status: 200,
        payload: createMockResponse(testCase, 'local API unreachable'),
        source: 'mock-fallback',
      };
    }

    return {
      status: 0,
      payload: {
        ok: false,
        error: {
          code: 'network-error',
          message: error instanceof Error ? error.message : String(error),
        },
      },
      source: 'network-error',
    };
  }
}

function markdownEscape(value) {
  return String(value ?? '').replace(/\|/g, '\\|');
}

function renderCheck(check) {
  const state = check.ok ? 'x' : ' ';
  const suffix = check.ok ? '' : ` (${check.severity})`;
  return `- [${state}] ${check.label}${suffix}`;
}

function renderReport(results, generatedAt) {
  const total = results.length;
  const openAiResponses = results.filter((item) => item.provider === 'openai').length;
  const mockResponses = results.filter((item) => item.provider === 'mock').length;
  const failed = results.filter((item) => item.evaluation.failed.length > 0).length;
  const needsAttention = results.filter((item) => item.evaluation.warnings.length > 0).length;
  const providers = [...new Set(results.map((item) => item.provider))].join(', ') || 'unknown';

  const lines = [
    '# AI Generation QA Report',
    '',
    `Generated at: ${generatedAt}`,
    `BASE_URL: ${baseUrl}`,
    `Provider: ${providers}`,
    '',
    '## Summary',
    '',
    `- Total: ${total}`,
    `- OpenAI responses: ${openAiResponses}`,
    `- Mock responses: ${mockResponses}`,
    `- Failed: ${failed}`,
    `- Needs attention: ${needsAttention}`,
    '',
    '## Cases',
    '',
    '| ID | Case | Provider | Failed | Warnings | Result Preview |',
    '| --- | --- | --- | ---: | ---: | --- |',
    ...results.map((item) => {
      const preview = markdownEscape(item.payload.result?.resultText ?? item.payload.error?.message ?? '');
      return `| ${item.case.id} | ${markdownEscape(item.case.title)} | ${item.provider} | ${item.evaluation.failed.length} | ${item.evaluation.warnings.length} | ${preview} |`;
    }),
    '',
    '## Results',
    '',
  ];

  for (const item of results) {
    const result = item.payload.result ?? {};
    const error = item.payload.error;
    lines.push(`### ${item.case.id} ${item.case.title}`);
    lines.push('');
    lines.push(`Expected: ${item.case.expected}`);
    lines.push('');
    lines.push('Input:');
    lines.push('');
    lines.push('```txt');
    lines.push(item.case.request.sourceText);
    lines.push('```');
    lines.push('');
    lines.push('Request:');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(item.case.request, null, 2));
    lines.push('```');
    lines.push('');

    if (error) {
      lines.push('Error:');
      lines.push('');
      lines.push('```json');
      lines.push(JSON.stringify(error, null, 2));
      lines.push('```');
      lines.push('');
    }

    lines.push('Result:');
    lines.push('');
    lines.push('```txt');
    lines.push(result.resultText ?? '');
    lines.push('```');
    lines.push('');
    lines.push('Pinyin:');
    lines.push('');
    lines.push('```txt');
    lines.push(result.pinyin ?? '');
    lines.push('```');
    lines.push('');
    lines.push(`Provider: ${item.provider}`);
    lines.push(`HTTP status: ${item.status}`);
    lines.push(`Generated at: ${item.payload.meta?.generatedAt ?? ''}`);
    lines.push('');
    lines.push('Checks:');
    lines.push('');
    lines.push(...item.evaluation.checks.map(renderCheck));
    lines.push('');
    lines.push('Notes:');
    lines.push('');
    if (item.evaluation.failed.length === 0 && item.evaluation.warnings.length === 0) {
      lines.push('- 自動チェック上の構造不備や注意はありません。自然さの最終判断は人間確認です。');
    } else {
      for (const warning of item.evaluation.warnings) {
        lines.push(`- WARN: ${warning.label}`);
      }
      for (const failure of item.evaluation.failed) {
        lines.push(`- FAIL: ${failure.label}`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

const generatedAt = new Date().toISOString();
const results = [];

for (const testCase of cases) {
  const apiResult = await callApi(testCase);
  const provider = apiResult.payload.meta?.provider ?? apiResult.source;
  const evaluation = evaluateResult(testCase, apiResult.payload, apiResult.status);
  results.push({
    case: testCase,
    status: apiResult.status,
    payload: apiResult.payload,
    provider,
    evaluation,
  });

  const mark = evaluation.failed.length > 0 ? 'FAIL' : evaluation.warnings.length > 0 ? 'WARN' : 'OK';
  console.log(`${mark} ${testCase.id} ${testCase.title} provider=${provider}`);
}

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, renderReport(results, generatedAt), 'utf8');

const failedCount = results.filter((item) => item.evaluation.failed.length > 0).length;
const warnCount = results.filter((item) => item.evaluation.warnings.length > 0).length;

console.log('');
console.log(`AI generation QA report: ${outputPath}`);
console.log(`Total=${results.length} Failed=${failedCount} NeedsAttention=${warnCount}`);

if (failedCount > 0) {
  process.exit(1);
}
