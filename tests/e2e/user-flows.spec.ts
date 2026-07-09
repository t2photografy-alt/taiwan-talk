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
  '女性寄り',
  '男性寄り',
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
    const voice = {
      default: true,
      lang: 'zh-TW',
      localService: true,
      name: 'Mock Taiwan Voice',
      voiceURI: 'mock-taiwan-voice',
    } as SpeechSynthesisVoice;

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
        getVoices: () => [voice],
        speak: (utterance: SpeechSynthesisUtterance) => {
          activeUtterance = utterance;
          window.setTimeout(() => utterance.onstart?.(new Event('start') as SpeechSynthesisEvent), 0);
        },
      },
    });
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
      needsNativeCheck?: unknown;
      reviewStatus?: unknown;
    };
  };

  expect(payload.ok).toBe(true);
  expect(payload.result?.resultText).toEqual(expect.any(String));
  expect(payload.result?.pinyin).toEqual(expect.any(String));
  expect(payload.result?.needsNativeCheck).toBe(true);
  expect(payload.result?.reviewStatus).toBe('needs-native-check');
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
  await page.getByTestId('compose-input').fill(photoInput);
  const responsePromise = waitForMaybeGenerationResponse(page);
  await page.getByTestId('compose-generate-button').click();

  await expect(page.getByTestId('compose-result-source')).toContainText(photoInput, {
    timeout: generationWaitMs,
  });
  const resultText = await readGeneratedTaiwanText(page.getByTestId('compose-result-text'));
  expect(resultText).toMatch(photoIntentPattern);
  await expect(page.getByTestId('compose-result-pinyin')).not.toHaveText('', { timeout: generationWaitMs });
  await expect(page.getByTestId('needs-native-check-note')).toContainText('確認前');
  await expectNativeCheckFromApiIfAvailable(await responsePromise);

  await page.getByTestId('compose-save-button').click();
  await expect(page.getByText('保存しました')).toBeVisible();

  return { resultText };
}

test.beforeEach(async ({ page }) => {
  await installMockSpeech(page);
  await clearSavedPhrases(page);
});

test('Flow A: 使う画面から大きく表示して戻れる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('おすすめフレーズ')).toBeVisible();
  await expect(page.getByText('好久不見～')).toBeVisible();
  await expectLogoHealthy(page);
  await expectBottomNavVisible(page);
  await expectPageChromeHealthy(page);

  await page.getByRole('button', { name: '聞く' }).first().click();
  await expect(page.getByRole('button', { name: '停止' }).first()).toBeVisible();
  await page.getByRole('button', { name: '停止' }).first().click();
  await expect(page.getByRole('button', { name: '聞く' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'ゆっくり' }).first().click();
  await expect(page.getByRole('button', { name: '停止' }).first()).toBeVisible();
  await page.getByRole('button', { name: '聞く' }).first().click();
  await expect(page.getByRole('button', { name: '停止' }).first()).toBeVisible();
  await page.getByRole('button', { name: '停止' }).first().click();
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
});

test('Flow B: 作るから保存して保存画面で検索できる', async ({ page }) => {
  const phrase = await createAndSavePhotoPhrase(page);
  await page.getByRole('button', { name: '聞く' }).first().click();
  await page.getByRole('button', { name: 'ゆっくり' }).first().click();
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

test('Flow D: 練習で発音チェックモックから苦手に保存できる', async ({ page }) => {
  await installMockRecorder(page);
  await page.goto('/practice');
  await expect(page.getByText('録音待機')).toBeVisible();
  await page.getByRole('button', { name: '聞く', exact: true }).click();
  await page.getByRole('button', { name: 'ゆっくり聞く' }).click();
  await page.getByRole('button', { name: '録音する' }).click();
  await expect(page.getByText('録音中')).toBeVisible();
  await page.getByRole('button', { name: '停止', exact: true }).click();
  await expect(page.getByText('録音できました')).toBeVisible();
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
  await page.getByRole('button', { name: '台灣華語' }).click();
  await expect(page.getByRole('button', { name: '使用' })).toBeVisible();
  await expect(page.getByRole('button', { name: '製作' })).toBeVisible();
  await page.getByRole('button', { name: '日本語' }).click();
  await expect(page.getByRole('button', { name: '使う', exact: true })).toBeVisible();
  await expect(page.getByText('音声設定')).toBeVisible();
  await page.getByRole('button', { name: '女性寄り' }).click();
  await expect(page.getByRole('button', { name: '女性寄り' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '男性寄り' }).click();
  await expect(page.getByRole('button', { name: '男性寄り' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '自動' }).click();
  await expect(page.getByRole('button', { name: '自動' })).toHaveAttribute('aria-pressed', 'true');
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

test('端末チェック: 音声テストと録音テストUIが操作できる', async ({ page }) => {
  await installMockRecorder(page);
  await page.goto('/settings');
  await expect(page.getByText('端末チェック')).toBeVisible();

  await page.getByRole('button', { name: '音声テスト' }).click();
  await expect(page.getByText('音声テストを再生しました')).toBeVisible();

  await page.getByRole('button', { name: '録音テスト' }).click();
  await expect(page.getByText('録音中')).toBeVisible();
  await page.getByRole('button', { name: '停止', exact: true }).click();
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
