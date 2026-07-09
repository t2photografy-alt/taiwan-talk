import { expect, test } from '@playwright/test';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const outputDir = resolve(process.cwd(), 'outputs', 'visual-qa');

const savedPhrase = {
  id: 'qa-saved-photo',
  sourceText: 'また写真撮らせてください！',
  resultText: '我們一起拍照吧！',
  sourceLanguage: 'ja',
  targetLanguage: 'zh-TW',
  pinyin: 'wo men yi qi pai zhao ba',
  tone: 'friendly',
  category: 'photo',
  nuance: 'スクリーンショットQA用の保存済みフレーズです。',
  readabilityScore: 83,
  needsNativeCheck: true,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
  isFavorite: false,
  practiceCount: 0,
  usedCount: 0,
};

async function seedSavedPhrase(page: import('@playwright/test').Page) {
  await page.evaluate((phrase) => {
    window.localStorage.setItem('taiwan-talk:phrases:v1', JSON.stringify([phrase]));
  }, savedPhrase);
}

test.beforeAll(() => {
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
});

test('390px主要画面の目視確認用スクリーンショットを保存する', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 880 });

  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await expect(page.getByText('おすすめフレーズ')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '00-home.png') });

  await page.goto('/compose');
  await expect(page.getByText('友達トーンの台湾華語')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '01-compose.png') });

  await page.goto('/messages');
  await expect(page.getByText('だいたいの意味')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '02-messages.png') });

  await page.goto('/practice');
  await expect(page.getByText('今日のフレーズ')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '03-practice.png') });

  await seedSavedPhrase(page);
  await page.goto('/saved');
  await expect(page.getByText('我們一起拍照吧！')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '04-saved.png') });

  await page.goto('/display/preset-see-you-long-time');
  await expect(page.getByText('好久不見～')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '05-display.png') });

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible();
  await expect(page.getByText('端末チェック')).toBeVisible();
  await page.screenshot({ fullPage: true, path: resolve(outputDir, '06-settings.png') });
});
