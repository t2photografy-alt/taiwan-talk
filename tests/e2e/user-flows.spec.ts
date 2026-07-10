import { expect, type Locator, type Page, type Response, test } from '@playwright/test';

const forbiddenTerms = [
  'オシカッツ',
  '気まま',
  '第一弾',
  '好きなもの',
  'Taiwantolk',
  'TaiwanTalk',
  '台湾トーク',
];

const guardedButtonLabels = [
  '聞く',
  '原文を聞く',
  'ゆっくり',
  '大きく表示',
  '練習する',
  'ゆっくり聞く',
  '停止',
  '自分の音声を聞く',
  'もう一回録音',
  '発音チェックへ',
  '苦手に保存',
  '音声テスト',
  '録音テスト',
  '録音を聞く',
  '状態を再確認',
  '自然・やわらかめ',
  '自然・落ち着いた声',
  '日本語で試す',
  '台灣華語で試す',
];

const photoInput = 'また写真撮らせてください！';
const photoIntentPattern = /拍|照|照片|相片/;
const replyIntentPattern = /下次|再|一起|玩/;
const cjkPattern = /[\u3400-\u9fff]/;
const kanaPattern = /[ぁ-んァ-ン]/;
const generationWaitMs = 60_000;

async function clearSavedPhrases(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
}

async function installMockSpeech(page: Page) {
  await page.addInitScript(() => {
    const taiwanVoice = {
      default: true,
      lang: 'zh-TW',
      localService: true,
      name: 'Mock Taiwan Voice',
      voiceURI: 'mock-taiwan-voice',
    } as SpeechSynthesisVoice;
    const japaneseVoice = {
      default: false,
      lang: 'ja-JP',
      localService: true,
      name: 'Mock Japanese Voice',
      voiceURI: 'mock-japanese-voice',
    } as SpeechSynthesisVoice;
    const voices = [taiwanVoice, japaneseVoice];
    (window as unknown as {
      __speechCalls: Array<{ text: string; lang: string; rate: number; voiceLang: string | null }>;
    }).__speechCalls = [];

    class MockSpeechSynthesisUtterance extends EventTarget {
      lang = '';
      pitch = 1;
      rate = 1;
      text: string;
      voice: SpeechSynthesisVoice | null = null;
      volume = 1;
      onstart: ((event: SpeechSynthesisEvent) => void) | null = null;
      onend: ((event: SpeechSynthesisEvent) => void) | null = null;
      onerror: ((event: SpeechSynthesisErrorEvent) => void) | null = null;
      onpause: ((event: SpeechSynthesisEvent) => void) | null = null;
      onresume: ((event: SpeechSynthesisEvent) => void) | null = null;

      constructor(text: string) {
        super();
        this.text = text;
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });

    let activeUtterance: SpeechSynthesisUtterance | null = null;

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {
          if (!activeUtterance) {
            return;
          }

          const ended = activeUtterance;
          activeUtterance = null;
          ended.onend?.(new Event('end') as SpeechSynthesisEvent);
        },
        getVoices: () => voices,
        speak: (utterance: SpeechSynthesisUtterance) => {
          activeUtterance = utterance;
          (window as unknown as {
            __speechCalls: Array<{ text: string; lang: string; rate: number; voiceLang: string | null }>;
          }).__speechCalls.push({
            text: utterance.text,
            lang: utterance.lang,
            rate: utterance.rate,
            voiceLang: utterance.voice?.lang ?? null,
          });
          if ((window as unknown as { __speechShouldFail?: boolean }).__speechShouldFail) {
            utterance.onerror?.(new Event('error') as SpeechSynthesisErrorEvent);
            return;
          }
          window.setTimeout(() => utterance.onstart?.(new Event('start') as SpeechSynthesisEvent), 0);
        },
      },
    });
  });
}

async function installMockAudio(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as { __audioCalls: Array<{ action: 'play' | 'pause'; src: string }> }).__audioCalls = [];

    class MockAudio {
      currentTime = 0;
      onabort: (() => void) | null = null;
      oncanplay: (() => void) | null = null;
      onended: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onpause: (() => void) | null = null;
      onplaying: (() => void) | null = null;
      onstalled: (() => void) | null = null;
      paused = true;
      src: string;

      constructor(src = '') {
        this.src = src;
      }

      async play() {
        this.paused = false;
        (window as unknown as { __audioCalls: Array<{ action: 'play' | 'pause'; src: string }> }).__audioCalls.push({
          action: 'play',
          src: this.src,
        });
        this.oncanplay?.();
        this.onplaying?.();
      }

      pause() {
        this.paused = true;
        (window as unknown as { __audioCalls: Array<{ action: 'play' | 'pause'; src: string }> }).__audioCalls.push({
          action: 'pause',
          src: this.src,
        });
        this.onpause?.();
      }
    }

    Object.defineProperty(window, 'Audio', { configurable: true, value: MockAudio });
  });
}

async function installMockRecorder(page: Page) {
  await page.addInitScript(() => {
    class MockMediaRecorder extends EventTarget {
      static isTypeSupported() {
        return true;
      }

      mimeType: string;
      state: RecordingState = 'inactive';

      constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
        super();
        this.mimeType = options?.mimeType ?? 'audio/webm';
      }

      start() {
        this.state = 'recording';
      }

      stop() {
        if (this.state === 'inactive') {
          return;
        }

        this.state = 'inactive';
        const data = new Blob(['mock-audio'], { type: this.mimeType });
        const dataEvent = new Event('dataavailable') as Event & { data: Blob };
        Object.defineProperty(dataEvent, 'data', { value: data });
        this.dispatchEvent(dataEvent);
        this.dispatchEvent(new Event('stop'));
      }
    }

    Object.defineProperty(window, 'MediaRecorder', {
      configurable: true,
      value: MockMediaRecorder,
    });

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () =>
          ({
            getTracks: () => [{ stop() {} }],
          }) as unknown as MediaStream,
      },
    });
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const root = document.documentElement;
        const body = document.body;
        return {
          bodyOverflow: body.scrollWidth - body.clientWidth,
          rootOverflow: root.scrollWidth - root.clientWidth,
        };
      }),
    )
    .toEqual({ bodyOverflow: 0, rootOverflow: 0 });
}

async function expectPrimarySurfacesInsideViewport(page: Page) {
  const overflows = await page
    .locator('.glass-card, .phrase-hero, .bottom-nav, article, section')
    .evaluateAll((elements) => {
      const viewportWidth = document.documentElement.clientWidth;
      return elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: element.getAttribute('class') ?? '',
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            overflows: rect.left < -1 || rect.right > viewportWidth + 1,
          };
        })
        .filter((item) => item.width > 0 && item.overflows);
    });

  expect(overflows).toEqual([]);
}

async function expectBottomNavVisible(page: Page) {
  await expect(page.getByRole('navigation', { name: '主要画面' })).toBeVisible();
}

async function expectBottomNavHidden(page: Page) {
  await expect(page.getByRole('navigation', { name: '主要画面' })).toHaveCount(0);
}

async function expectButtonLabelNotBroken(button: Locator, label: string) {
  await expect(button).toBeVisible();
  const metrics = await button.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return {
      height: rect.height,
      text: element.textContent?.trim() ?? '',
      whiteSpace: style.whiteSpace,
      width: rect.width,
    };
  });

  expect(metrics.text).toContain(label);
  expect(metrics.whiteSpace).toBe('nowrap');
  expect(metrics.width).toBeGreaterThan(72);
  expect(metrics.height).toBeLessThan(62);
}

async function expectGuardedButtonsHealthy(page: Page) {
  for (const label of guardedButtonLabels) {
    const buttons = page.getByRole('button', { name: label });
    const count = await buttons.count();

    for (let index = 0; index < count; index += 1) {
      const button = buttons.nth(index);
      const visibleText = await button.evaluate((element) => element.textContent?.trim() ?? '');
      if ((await button.isVisible()) && visibleText.includes(label)) {
        await expectButtonLabelNotBroken(button, label);
      }
    }
  }
}

async function expectPageChromeHealthy(page: Page) {
  await expectNoHorizontalOverflow(page);
  await expectPrimarySurfacesInsideViewport(page);
  await expectGuardedButtonsHealthy(page);
}

async function expectNoForbiddenText(page: Page) {
  const visibleText = await page.locator('body').innerText();
  for (const term of forbiddenTerms) {
    expect(visibleText).not.toContain(term);
  }
  expect(visibleText).toContain('Taiwan Talk');
}

async function expectLogoHealthy(page: Page, expectedSize: 'header' | 'compact' = 'header') {
  const logo = page.getByRole('img', { name: 'Taiwan Talk' }).first();
  await expect(logo).toBeVisible();

  const box = await logo.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(expectedSize === 'header' ? 54 : 32);
  expect(box!.height).toBeGreaterThanOrEqual(expectedSize === 'header' ? 54 : 32);
  expect(Math.abs(box!.width - box!.height)).toBeLessThanOrEqual(2);

  const objectFit = await logo.evaluate((element) => window.getComputedStyle(element).objectFit);
  expect(objectFit).toBe('contain');
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

function waitForMaybeGenerationResponse(page: Page) {
  return page
    .waitForResponse(
      (candidate) =>
        candidate.url().includes('/api/conversation/generate') &&
        candidate.request().method() === 'POST',
      { timeout: generationWaitMs },
    )
    .catch(() => null);
}

async function expectNativeCheckFromApiIfAvailable(response: Response | null) {
  if (!response || response.status() !== 200) {
    return;
  }

  const payload = (await response.json()) as {
    ok?: unknown;
    result?: {
      resultText?: unknown;
      pinyin?: unknown;
      sourceLanguage?: unknown;
      targetLanguage?: unknown;
      needsNativeCheck?: unknown;
      reviewStatus?: unknown;
      literalMeaning?: unknown;
    };
  };

  expect(payload.ok).toBe(true);
  expect(payload.result?.resultText).toEqual(expect.any(String));
  expect(payload.result?.literalMeaning).toEqual(expect.any(String));
  if (payload.result?.targetLanguage !== 'ja' || payload.result?.sourceLanguage === 'zh-TW') {
    expect(payload.result?.pinyin).toEqual(expect.any(String));
  }
  expect(payload.result?.needsNativeCheck).toBe(true);
  expect(payload.result?.reviewStatus).toBe('needs-native-check');
}

async function expectGenerationRequestLanguages(
  response: Response | null,
  sourceLanguage: 'ja' | 'zh-TW',
  targetLanguage: 'ja' | 'zh-TW',
) {
  if (!response) {
    return;
  }

  const requestBody = response.request().postDataJSON() as {
    sourceLanguage?: string;
    targetLanguage?: string;
  };

  expect(requestBody.sourceLanguage).toBe(sourceLanguage);
  expect(requestBody.targetLanguage).toBe(targetLanguage);
}

async function expectLatestSpeechCall(
  page: Page,
  expected: { lang: 'zh-TW' | 'ja-JP'; text: string | RegExp; rate?: number },
) {
  await expect
    .poll(async () => {
      const call = await page.evaluate(() => {
        const calls = (window as unknown as {
          __speechCalls?: Array<{ text: string; lang: string; rate: number; voiceLang: string | null }>;
        }).__speechCalls ?? [];
        return calls.at(-1) ?? null;
      });

      return {
        lang: call?.lang ?? null,
        rate: call?.rate ?? null,
        voiceLang: call?.voiceLang ?? null,
      };
    })
    .toEqual({
      lang: expected.lang,
      rate: expected.rate ?? 1,
      voiceLang: expected.lang,
    });

  const call = await page.evaluate(() => {
    const calls = (window as unknown as {
      __speechCalls?: Array<{ text: string; lang: string; rate: number; voiceLang: string | null }>;
    }).__speechCalls ?? [];
    return calls.at(-1) ?? null;
  });

  if (typeof expected.text === 'string') {
    expect(normalizeText(call?.text ?? '')).toContain(normalizeText(expected.text));
  } else {
    expect(call?.text).toMatch(expected.text);
  }
}

async function readGeneratedTaiwanText(locator: Locator) {
  await expect(locator).toBeVisible({ timeout: generationWaitMs });
  await expect.poll(async () => normalizeText(await locator.innerText()), { timeout: generationWaitMs }).not.toBe('');

  const text = (await locator.innerText()).trim();
  expect(text).toMatch(cjkPattern);
  expect(text).not.toMatch(kanaPattern);
  return text;
}

async function createAndSavePhotoPhrase(page: Page) {
  await page.goto('/compose');
  await expect(page.getByTestId('compose-input')).toHaveValue('');
  await expect(page.getByTestId('compose-input')).toHaveAttribute('placeholder', '例：また写真撮らせてください！');
  await page.getByTestId('compose-input').fill(photoInput);
  const responsePromise = waitForMaybeGenerationResponse(page);
  await page.getByTestId('compose-generate-button').click();

  await expect(page.getByTestId('compose-result-source')).toContainText(photoInput, {
    timeout: generationWaitMs,
  });
  const resultText = await readGeneratedTaiwanText(page.getByTestId('compose-result-text'));
  expect(resultText).toMatch(photoIntentPattern);
  await expect(page.getByTestId('compose-result-pinyin')).not.toHaveText('', { timeout: generationWaitMs });
  await expect(page.getByTestId('compose-main-listen')).toHaveAttribute('data-speech-language', 'zh-TW');
  await expect(page.getByTestId('compose-main-listen')).toHaveAttribute('data-speech-text', resultText);
  await expect(page.getByTestId('compose-original-listen')).toHaveCount(0);
  await expect(page.getByTestId('needs-native-check-note')).toContainText('確認前');
  await expectNativeCheckFromApiIfAvailable(await responsePromise);

  await page.getByTestId('compose-save-button').click();
  await expect(page.getByText('保存しました')).toBeVisible();

  return { resultText };
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/speech/generate', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: { code: 'disabled', message: 'TTS disabled in flow QA' } }),
    });
  });
  await installMockSpeech(page);
  await installMockAudio(page);
  await clearSavedPhrases(page);
});

test('Flow A: 使う画面から大きく表示して戻れる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('おすすめフレーズ')).toBeVisible();
  await expect(page.getByRole('button', { name: '日本語 → 台湾華語' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: '台湾華語 → 日本語' })).toBeVisible();
  await expect(page.getByText('好久不見～')).toBeVisible();
  await expectLogoHealthy(page);
  await expectBottomNavVisible(page);
  await expectPageChromeHealthy(page);

  await expect(page.getByTestId('phrase-main-listen').first()).toHaveAttribute('data-speech-language', 'zh-TW');
  await expect(page.getByTestId('phrase-main-listen').first()).toHaveAttribute('data-speech-text', /好久不見/);
  const homeListenButton = page.getByTestId('phrase-main-listen').first();
  const homeSlowButton = page.getByTestId('phrase-main-slow').first();
  await homeListenButton.click();
  await expectLatestSpeechCall(page, { lang: 'zh-TW', text: /好久不見/ });
  await expect(page.getByTestId('speech-fallback-notice').first()).toContainText('端末の音声');
  await expect(homeListenButton).toContainText('停止');
  await homeListenButton.click();
  await expect(page.getByRole('button', { name: '聞く' }).first()).toBeVisible();

  await homeSlowButton.click();
  await expectLatestSpeechCall(page, { lang: 'zh-TW', text: /好久不見/, rate: 0.75 });
  await expect(homeSlowButton).toContainText('停止');
  await homeListenButton.click();
  await expect(homeListenButton).toContainText('停止');
  await homeListenButton.click();
  await expect(page.getByRole('button', { name: 'ゆっくり' }).first()).toBeVisible();
  await expectPageChromeHealthy(page);

  await page.getByRole('button', { name: '大きく表示' }).first().click();
  await expect(page).toHaveURL(/\/display\/preset-see-you-long-time/);
  await expect(page.getByText('好久不見～')).toBeVisible();
  await expectBottomNavHidden(page);
  await expectLogoHealthy(page, 'compact');
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: '戻る' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('おすすめフレーズ')).toBeVisible();

  await page.getByRole('button', { name: '台湾華語 → 日本語' }).click();
  await expect(page.getByRole('button', { name: '台湾華語 → 日本語' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('終於又見到你了，真的很開心！')).toBeVisible();
  await expect(page.getByTestId('phrase-main-listen').first()).toHaveAttribute('data-speech-language', 'ja-JP');
  await expect(page.getByTestId('phrase-main-listen').first()).toHaveAttribute('data-speech-text', /久しぶり/);
  await expect(page.getByTestId('phrase-original-listen').first()).toHaveAttribute('data-speech-language', 'zh-TW');
  await expect(page.getByTestId('phrase-original-listen').first()).toHaveAttribute('data-speech-text', /好久不見/);
  await page.getByTestId('phrase-main-listen').first().click();
  await expectLatestSpeechCall(page, { lang: 'ja-JP', text: /久しぶり/ });
  await page.getByTestId('phrase-main-listen').first().click();
  await page.getByTestId('phrase-original-listen').first().click();
  await expectLatestSpeechCall(page, { lang: 'zh-TW', text: /好久不見/ });
  await page.getByTestId('phrase-original-listen').first().click();
  await page.getByRole('button', { name: '大きく表示' }).first().click();
  await expect(page.getByTestId('display-result-text')).toContainText('久しぶり');
  await expect(page.getByTestId('display-source-text')).toContainText('好久不見');
});

test('Flow B: 作るから保存して保存画面で検索できる', async ({ page }) => {
  const phrase = await createAndSavePhotoPhrase(page);
  await page.getByRole('button', { name: '聞く' }).first().click();
  await expectLatestSpeechCall(page, { lang: 'zh-TW', text: phrase.resultText });
  await page.getByRole('button', { name: 'ゆっくり' }).first().click();
  await expectLatestSpeechCall(page, { lang: 'zh-TW', text: phrase.resultText, rate: 0.75 });
  await expectPageChromeHealthy(page);

  await page.goto('/saved');
  const savedCard = page.getByTestId('saved-phrase-card').first();
  await expect(savedCard.getByTestId('saved-phrase-source')).toContainText(photoInput);
  await expect(savedCard.getByTestId('saved-phrase-result')).toContainText(phrase.resultText);
  await page.getByPlaceholder('保存フレーズを検索').fill('写真');
  await expect(savedCard.getByTestId('saved-phrase-source')).toContainText(photoInput);
  await expect(savedCard.getByTestId('saved-phrase-result')).toContainText(phrase.resultText);
  await expectPageChromeHealthy(page);
});

test('Flow C: 保存フレーズを大きく表示して練習へ進める', async ({ page }) => {
  const phrase = await createAndSavePhotoPhrase(page);

  await page.goto('/saved');
  const savedCard = page.getByTestId('saved-phrase-card').first();
  await expect(savedCard.getByTestId('saved-phrase-source')).toContainText(photoInput);
  await savedCard.getByTestId('phrase-display-button').click();
  await expect(page).toHaveURL(/\/display\/phrase-/);
  await expect(page.getByTestId('display-result-text')).toContainText(phrase.resultText);
  await expectBottomNavHidden(page);

  await page.getByTestId('display-practice-button').click();
  await expect(page).toHaveURL(/\/practice\?phrase=phrase-/);
  await expect(page.getByText('今日のフレーズ')).toBeVisible();
  await expect
    .poll(async () => normalizeText(await page.getByTestId('practice-phrase-text').innerText()))
    .toContain(normalizeText(phrase.resultText));
  await expectPageChromeHealthy(page);
});

test('作る画面: 台湾華語から日本語へ生成して保存・表示・練習へ進める', async ({ page }) => {
  const taiwanText = '下次也一起玩吧～';

  await page.goto('/compose');
  await page.getByRole('button', { name: '台湾華語から' }).click();
  await expect(page.getByTestId('compose-input')).toHaveValue('');
  await expect(page.getByTestId('compose-input')).toHaveAttribute('placeholder', '例：下次也一起玩吧～');
  await page.getByTestId('compose-input').fill(taiwanText);

  const responsePromise = waitForMaybeGenerationResponse(page);
  await page.getByTestId('compose-generate-button').click();
  const response = await responsePromise;
  await expectGenerationRequestLanguages(response, 'zh-TW', 'ja');
  await expectNativeCheckFromApiIfAvailable(response);

  await expect(page.getByTestId('compose-result-source')).toContainText(taiwanText, {
    timeout: generationWaitMs,
  });
  const japaneseResult = normalizeText(await page.getByTestId('compose-result-text').innerText());
  expect(japaneseResult).not.toBe('');
  expect(japaneseResult).toMatch(/[ぁ-んァ-ン一-龯]/);
  await expect(page.getByTestId('compose-result-nuance')).toBeVisible();
  const nuance = normalizeText(await page.getByTestId('compose-result-nuance').innerText());
  const literalMeaning = normalizeText(await page.getByTestId('compose-literal-meaning').innerText());
  expect(nuance).not.toBe('');
  expect(nuance).not.toBe(japaneseResult);
  expect(nuance).not.toBe(literalMeaning);
  expect(literalMeaning).not.toBe('');
  expect(literalMeaning).not.toBe(japaneseResult);
  await expect(page.getByTestId('compose-result-pinyin')).not.toHaveText('', { timeout: generationWaitMs });
  await expect(page.getByTestId('compose-main-listen')).toHaveAttribute('data-speech-language', 'ja-JP');
  expect(normalizeText((await page.getByTestId('compose-main-listen').getAttribute('data-speech-text')) ?? '')).toBe(japaneseResult);
  await expect(page.getByTestId('compose-main-slow')).toHaveAttribute('data-speech-language', 'ja-JP');
  await expect(page.getByTestId('compose-original-listen')).toHaveAttribute('data-speech-language', 'zh-TW');
  await expect(page.getByTestId('compose-original-listen')).toHaveAttribute('data-speech-text', taiwanText);
  await page.getByTestId('compose-main-listen').click();
  await expectLatestSpeechCall(page, { lang: 'ja-JP', text: japaneseResult });
  await page.getByTestId('compose-main-listen').click();
  await page.getByTestId('compose-main-slow').click();
  await expectLatestSpeechCall(page, { lang: 'ja-JP', text: japaneseResult, rate: 0.75 });
  await page.getByTestId('compose-main-slow').click();
  await page.getByTestId('compose-original-listen').click();
  await expectLatestSpeechCall(page, { lang: 'zh-TW', text: taiwanText });
  await page.getByTestId('compose-original-listen').click();

  await page.getByTestId('compose-save-button').click();
  await expect(page.getByText('保存しました')).toBeVisible();

  await page.goto('/saved');
  const savedCard = page.getByTestId('saved-phrase-card').first();
  await expect(savedCard.getByTestId('saved-phrase-source')).toContainText(taiwanText);
  await expect(savedCard.getByTestId('saved-phrase-result')).toContainText(japaneseResult);

  await savedCard.getByTestId('phrase-display-button').click();
  await expect(page.getByTestId('display-result-text')).toContainText(japaneseResult);
  await expect(page.getByTestId('display-source-text')).toContainText(taiwanText);

  await page.getByTestId('display-practice-button').click();
  await expect(page).toHaveURL(/\/practice\?phrase=phrase-/);
  await expect(page.getByTestId('practice-phrase-text')).toContainText(taiwanText);
  await expect(page.getByTestId('practice-main-listen')).toHaveAttribute('data-speech-language', 'zh-TW');
  await expect(page.getByTestId('practice-main-listen')).toHaveAttribute('data-speech-text', taiwanText);
  await expectPageChromeHealthy(page);
});

test('原文に近い意味: 自然な対象言語でresultTextと役割を分ける', async ({ page }) => {
  await page.goto('/compose');
  await page.getByRole('button', { name: '台湾華語から' }).click();
  await page.getByTestId('compose-input').fill('明年也要來喔！');
  await page.getByTestId('compose-generate-button').click();

  await expect(page.getByTestId('compose-result-text')).toBeVisible({ timeout: generationWaitMs });
  const resultText = normalizeText(await page.getByTestId('compose-result-text').innerText());
  const literalMeaning = normalizeText(await page.getByTestId('compose-literal-meaning').innerText());
  expect(literalMeaning).not.toBe('');
  expect(literalMeaning).not.toBe(resultText);
  expect(literalMeaning).toContain('来年');
  expect(literalMeaning).not.toContain('明年も');
  expect(literalMeaning).not.toBe('明年も来てくださいね！');
});

test('Flow D: 練習で発音チェックモックから苦手に保存できる', async ({ page }) => {
  await installMockRecorder(page);
  await page.goto('/practice');
  await expect(page.getByText('録音待機')).toBeVisible();
  const listenButton = page.getByTestId('practice-main-listen');
  const slowButton = page.getByTestId('practice-main-slow');
  await listenButton.click();
  await slowButton.click();
  await expect(slowButton).toContainText('停止');
  const speechCallsBeforeRecording = await page.evaluate(
    () => (window as unknown as { __speechCalls?: unknown[] }).__speechCalls?.length ?? 0,
  );

  await page.getByRole('button', { name: '録音する' }).click();
  await expect(page.getByText('録音中')).toBeVisible();
  await expect(slowButton).toContainText('ゆっくり聞く');
  await expect(listenButton).toBeDisabled();
  await expect(slowButton).toBeDisabled();
  await listenButton.evaluate((element) => (element as HTMLButtonElement).click());
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __speechCalls?: unknown[] }).__speechCalls?.length ?? 0,
      ),
    )
    .toBe(speechCallsBeforeRecording);

  const recordingStop = page.getByTestId('practice-recording-stop');
  await expect(recordingStop).toHaveCount(1);
  await expect(recordingStop).toHaveAccessibleName('録音を停止');
  await recordingStop.click();
  await expect(page.getByText('録音できました')).toBeVisible();
  await expect(listenButton).toBeEnabled();
  await expect(slowButton).toBeEnabled();
  await expect(page.getByRole('button', { name: '自分の音声を聞く' })).toBeVisible();
  await page.getByRole('button', { name: '発音チェックへ' }).click();
  await expect(page.getByText('あなたの発音チェック結果')).toBeVisible();
  await expect(page.getByText('通じやすさ', { exact: true })).toBeVisible();
  await expect(page.getByText('発音チェック結果は現在、開発中の仮表示です。')).toBeVisible();

  await page.getByRole('button', { name: '苦手に保存' }).click();
  await expect(page.getByText('苦手に保存しました')).toBeVisible();
  await expectPageChromeHealthy(page);
});

test('Flow E: メッセージ意味確認から返信保存と大きく表示へ進める', async ({ page }) => {
  await page.goto('/messages');
  await expect(page.getByTestId('messages-input')).toHaveValue('');
  await expect(page.getByTestId('messages-input')).toHaveAttribute('placeholder', '例：下次也一起玩吧～');
  await page.getByLabel('相手から来たメッセージ').fill('下次也一起玩吧～');
  await page.getByRole('button', { name: '意味を確認' }).click();
  await expect(page.getByText('だいたいの意味')).toBeVisible();

  const responsePromise = waitForMaybeGenerationResponse(page);
  await page.getByRole('button', { name: 'また会いたい' }).click();
  await expectNativeCheckFromApiIfAvailable(await responsePromise);

  const replyLocator = page.getByTestId('messages-reply-text');
  await expect
    .poll(async () => normalizeText(await replyLocator.innerText()), { timeout: generationWaitMs })
    .toMatch(replyIntentPattern);
  const replyText = await readGeneratedTaiwanText(replyLocator);
  expect(replyText).toMatch(replyIntentPattern);
  await expect(page.getByTestId('needs-native-check-note')).toContainText('確認前');
  await page.getByTestId('messages-save-button').click();
  await expect(page.getByText('返信候補を保存しました')).toBeVisible();

  await page.getByTestId('messages-display-button').click();
  await expect(page).toHaveURL(/\/display\/draft-/);
  await expect(page.getByTestId('display-result-text')).toContainText(replyText);
  await expectBottomNavHidden(page);
  await expectNoHorizontalOverflow(page);
});

test('Flow F: 左上メニューから設定へ進み禁止文言が出ていない', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('設定を開く').click();
  await expect(page).toHaveURL('/settings');
  await expect(page.getByRole('heading', { name: '設定', exact: true })).toBeVisible();
  await expect(page.getByText('表示', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '台灣華語', exact: true }).click();
  await expect(page.getByRole('button', { name: '使用', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '製作', exact: true })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('taiwan-talk-display-language')))
    .toBe('zh-TW');
  await expect(page.getByText('聲音設定')).toBeVisible();
  await expect(page.getByText('裝置檢查')).toBeVisible();
  await expect(page.getByRole('button', { name: '聲音測試' })).toBeVisible();
  await page.getByRole('button', { name: '日文顯示' }).click();
  await expect(page.getByRole('button', { name: '使う', exact: true })).toBeVisible();
  await expect(page.getByText('音声設定')).toBeVisible();
  await expect(page.getByTestId('voice-style-natural-soft')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('voice-style-natural-calm').click();
  await expect(page.getByTestId('voice-style-natural-calm')).toHaveAttribute('aria-pressed', 'true');
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('taiwan-talk-tts-voice-style')))
    .toBe('natural-calm');
  await expect(page.getByTestId('voice-preview-natural-soft-ja-JP')).toBeVisible();
  await expect(page.getByTestId('voice-preview-natural-soft-zh-TW')).toBeVisible();
  await expect(page.getByText('読み上げ音声はAIで生成されます。')).toBeVisible();
  await expect(page.getByText('端末チェック')).toBeVisible();
  await expect(page.getByText('この端末で音声・録音・保存が使えるか確認します。')).toBeVisible();
  await expect(page.getByRole('button', { name: '音声テスト' })).toBeVisible();
  await expect(page.getByRole('button', { name: '録音テスト' })).toBeVisible();
  await expect(page.getByRole('button', { name: '状態を再確認' })).toBeVisible();
  await expect(page.getByText('台湾華語の表現は、今後ネイティブ確認を入れて調整予定です。')).toBeVisible();
  await expectNoForbiddenText(page);
  await expectLogoHealthy(page);
  await expectPageChromeHealthy(page);
});

test('音声エラー: TTSと端末音声が失敗しても停止表示を残さず再操作できる', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    (window as unknown as { __speechShouldFail: boolean }).__speechShouldFail = true;
  });

  const listenButton = page.getByTestId('phrase-main-listen').first();
  const slowButton = page.getByTestId('phrase-main-slow').first();
  await listenButton.click();
  await expect(page.getByText('端末の音声でも再生できませんでした。').first()).toBeVisible();
  await expect(listenButton).toContainText('聞く');
  await expect(listenButton).not.toContainText('停止');

  await listenButton.click();
  await expect(listenButton).toContainText('聞く');
  await slowButton.click();
  await expect(slowButton).toContainText('ゆっくり');
  await expect(slowButton).not.toContainText('停止');

  await page.evaluate(() => {
    (window as unknown as { __speechShouldFail: boolean }).__speechShouldFail = false;
  });
  await page.goto('/practice');
  await page.getByTestId('practice-main-listen').click();
  await expect(page.getByTestId('practice-main-listen')).toContainText('停止');
});

test('AI音声: 実voice styleを送り、聞く・ゆっくり・再タップ停止が動く', async ({ page }) => {
  await page.unroute('**/api/speech/generate');
  const ttsRequests: Array<{
    text: string;
    language: string;
    voiceStyle: string;
    speedMode: string;
  }> = [];

  await page.route('**/api/speech/generate', async (route) => {
    ttsRequests.push(route.request().postDataJSON());
    await route.fulfill({
      status: 200,
      contentType: 'audio/mpeg',
      body: Buffer.alloc(512, 1),
    });
  });

  await page.goto('/settings');
  await page.getByTestId('voice-style-natural-calm').click();
  await page.getByTestId('voice-preview-natural-calm-ja-JP').click();
  await expect(page.getByTestId('voice-preview-natural-calm-ja-JP')).toContainText('停止');
  await expect.poll(() => ttsRequests.length).toBe(1);
  expect(ttsRequests[0]).toMatchObject({
    language: 'ja-JP',
    voiceStyle: 'natural-calm',
    speedMode: 'normal',
  });

  await page.getByTestId('voice-preview-natural-calm-ja-JP').click();
  await expect(page.getByTestId('voice-preview-natural-calm-ja-JP')).toContainText('日本語で試す');
  await expect
    .poll(() => page.evaluate(() => ((window as unknown as { __audioCalls?: Array<{ action: string }> }).__audioCalls ?? []).some((call) => call.action === 'pause')))
    .toBe(true);

  await page.goto('/');
  await page.getByTestId('phrase-main-listen').first().click();
  await expect(page.getByTestId('phrase-main-listen').first()).toContainText('停止');
  await page.getByTestId('phrase-main-listen').first().click();
  await page.getByTestId('phrase-main-slow').first().click();
  await expect(page.getByTestId('phrase-main-slow').first()).toContainText('停止');

  await expect.poll(() => ttsRequests.length).toBe(3);
  expect(ttsRequests[1]).toMatchObject({ language: 'zh-TW', voiceStyle: 'natural-calm', speedMode: 'normal' });
  expect(ttsRequests[2]).toMatchObject({ language: 'zh-TW', voiceStyle: 'natural-calm', speedMode: 'slow' });
  await expect(page.getByTestId('speech-fallback-notice')).toHaveCount(0);
});

test('端末チェック: 音声テストと録音テストUIが操作できる', async ({ page }) => {
  await installMockRecorder(page);
  await page.goto('/settings');
  await expect(page.getByText('端末チェック')).toBeVisible();

  await page.getByRole('button', { name: '音声テスト' }).click();
  await expect(page.getByText('音声テストを再生しました')).toBeVisible();

  await page.getByRole('button', { name: '録音テスト' }).click();
  await expect(page.getByText('録音中')).toBeVisible();
  await page.getByTestId('settings-recording-stop').click();
  await expect(page.getByText('録音できました')).toBeVisible();
  await expect(page.getByRole('button', { name: '録音を聞く' })).toBeVisible();

  await page.getByRole('button', { name: '状態を再確認' }).click();
  await expectNoForbiddenText(page);
  await expectPageChromeHealthy(page);
});

test('390px layout smoke: required pages keep nav, logo, buttons, and width healthy', async ({ page }) => {
  const pages = ['/', '/compose', '/messages', '/practice', '/saved', '/settings'];

  for (const path of pages) {
    await page.goto(path);
    await expectLogoHealthy(page);
    await expectBottomNavVisible(page);
    await expectNoForbiddenText(page);
    if (path === '/settings') {
      await expect(page.getByText('端末チェック')).toBeVisible();
      await expect(page.getByText('台湾華語の表現は、今後ネイティブ確認を入れて調整予定です。')).toBeVisible();
    }
    if (path === '/practice') {
      await expect(page.getByText('録音待機')).toBeVisible();
    }
    await expectPageChromeHealthy(page);
  }

  await page.goto('/display/preset-see-you-long-time');
  await expectBottomNavHidden(page);
  await expectLogoHealthy(page, 'compact');
  await expectNoHorizontalOverflow(page);
});
