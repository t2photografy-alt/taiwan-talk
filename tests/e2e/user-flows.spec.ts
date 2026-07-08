import { expect, type Locator, type Page, test } from '@playwright/test';

const forbiddenTerms = [
  'オシカッツ',
  '気まま',
  '第一弾',
  '好きなもの',
  'Taiwantolk',
  'TaiwanTalk',
  '台湾トーク',
];

const guardedButtonLabels = ['聞く', 'ゆっくり', '大きく表示', '練習する', 'ゆっくり聞く', '苦手に保存'];

async function clearSavedPhrases(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
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

async function createAndSavePhotoPhrase(page: Page) {
  await page.goto('/compose');
  await page.getByLabel(/話したいこと/).fill('また写真撮らせてください！');
  await page.getByRole('button', { name: '自然な言い方にする' }).click();
  await expect(page.getByText('我們一起拍照吧！')).toBeVisible();
  await page.getByRole('button', { name: '保存する' }).click();
  await expect(page.getByText('保存しました')).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await clearSavedPhrases(page);
});

test('Flow A: 使う画面から大きく表示して戻れる', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('おすすめフレーズ')).toBeVisible();
  await expect(page.getByText('好久不見～')).toBeVisible();
  await expectLogoHealthy(page);
  await expectBottomNavVisible(page);
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
  await createAndSavePhotoPhrase(page);
  await expectPageChromeHealthy(page);

  await page.goto('/saved');
  await expect(page.getByText('我們一起拍照吧！')).toBeVisible();
  await page.getByPlaceholder('保存フレーズを検索').fill('写真');
  await expect(page.getByText('我們一起拍照吧！')).toBeVisible();
  await expectPageChromeHealthy(page);
});

test('Flow C: 保存フレーズを大きく表示して練習へ進める', async ({ page }) => {
  await createAndSavePhotoPhrase(page);

  await page.goto('/saved');
  await page.getByRole('button', { name: '大きく表示' }).first().click();
  await expect(page).toHaveURL(/\/display\/phrase-/);
  await expect(page.getByText('我們一起拍照吧！')).toBeVisible();
  await expectBottomNavHidden(page);

  await page.getByRole('button', { name: '練習' }).click();
  await expect(page).toHaveURL(/\/practice\?phrase=phrase-/);
  await expect(page.getByText('今日のフレーズ')).toBeVisible();
  await expect(page.getByRole('heading', { name: '我們一起拍照吧！' })).toBeVisible();
  await expectPageChromeHealthy(page);
});

test('Flow D: 練習で発音チェックモックから苦手に保存できる', async ({ page }) => {
  await page.goto('/practice');
  await page.getByLabel('録音して発音チェック').click();
  await expect(page.getByText('あなたの発音チェック結果')).toBeVisible();
  await expect(page.getByText('通じやすさ', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: '苦手に保存' }).click();
  await expect(page.getByText('苦手に保存しました')).toBeVisible();
  await expectPageChromeHealthy(page);
});

test('Flow E: メッセージ意味確認から返信保存と大きく表示へ進める', async ({ page }) => {
  await page.goto('/messages');
  await page.getByLabel('相手から来たメッセージ').fill('下次也一起玩吧～');
  await page.getByRole('button', { name: '意味を確認' }).click();
  await expect(page.getByText('だいたいの意味')).toBeVisible();

  await page.getByRole('button', { name: 'また会いたい' }).click();
  await expect(page.getByText('我還想再見你！')).toBeVisible();
  await page.getByRole('button', { name: '保存' }).first().click();
  await expect(page.getByText('返信候補を保存しました')).toBeVisible();

  await page.getByRole('button', { name: '大きく表示' }).click();
  await expect(page).toHaveURL(/\/display\/draft-/);
  await expect(page.getByText('我還想再見你！')).toBeVisible();
  await expectBottomNavHidden(page);
  await expectNoHorizontalOverflow(page);
});

test('Flow F: 左上メニューから設定へ進み禁止文言が出ていない', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('設定を開く').click();
  await expect(page).toHaveURL('/settings');
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  await expectNoForbiddenText(page);
  await expectLogoHealthy(page);
  await expectPageChromeHealthy(page);
});

test('390px layout smoke: required pages keep nav, logo, buttons, and width healthy', async ({ page }) => {
  const pages = ['/', '/compose', '/messages', '/practice', '/saved', '/settings'];

  for (const path of pages) {
    await page.goto(path);
    await expectLogoHealthy(page);
    await expectBottomNavVisible(page);
    await expectNoForbiddenText(page);
    await expectPageChromeHealthy(page);
  }

  await page.goto('/display/preset-see-you-long-time');
  await expectBottomNavHidden(page);
  await expectLogoHealthy(page, 'compact');
  await expectNoHorizontalOverflow(page);
});
