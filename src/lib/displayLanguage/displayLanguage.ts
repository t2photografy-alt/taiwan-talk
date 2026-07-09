import type { DisplayLanguage, TranslationKey } from './types';

export const DISPLAY_LANGUAGE_STORAGE_KEY = 'taiwan-talk-display-language';

export const displayLanguageLabels: Record<DisplayLanguage, string> = {
  ja: '日本語',
  'zh-TW': '台灣華語',
};

const translations: Record<DisplayLanguage, Record<TranslationKey, string>> = {
  ja: {
    'brand.subtitle': '日本と台湾の友達を、もっと近くに。',
    'language.label': '表示',
    'language.ja': '日本語',
    'language.zh': '台灣華語',
    'nav.home': '使う',
    'nav.compose': '作る',
    'nav.messages': 'メッセージ',
    'nav.practice': '練習',
    'nav.saved': '保存',
    'page.home.title': '使う',
    'page.home.subtitle': '登録フレーズをすぐに使う',
    'page.compose.title': '作る',
    'page.compose.subtitle': '話したいことを、自然な言い方に',
    'page.messages.title': 'メッセージ',
    'page.messages.subtitle': '届いた文の意味を確認して、返事を作る',
    'page.practice.title': '練習',
    'page.practice.subtitle': 'まねして話して、通じやすさをチェック',
    'page.saved.title': '保存',
    'page.saved.subtitle': 'よく使う言い方を、すぐ見返す',
    'page.settings.title': '設定',
    'page.settings.subtitle': 'Taiwan Talk の前提と使い方',
    'cta.listen': '聞く',
    'cta.slow': 'ゆっくり',
    'cta.slowListen': 'ゆっくり聞く',
    'cta.stop': '停止',
    'cta.largeDisplay': '大きく表示',
    'cta.practice': '練習する',
    'cta.save': '保存',
    'cta.savePhrase': '保存する',
    'cta.saved': '保存済み',
    'settings.deviceCheck': '端末チェック',
    'settings.deviceCheckDescription': 'この端末で音声・録音・保存が使えるか確認します。',
    'settings.speech': '音声再生',
    'settings.recording': '録音',
    'settings.microphone': 'マイク',
    'settings.storage': '保存',
    'settings.displayMode': '表示モード',
    'settings.network': '通信状態',
    'settings.speechTest': '音声テスト',
    'settings.recordingTest': '録音テスト',
    'settings.recheck': '状態を再確認',
    'settings.voiceSettings': '音声設定',
    'settings.voiceDescription':
      '読み上げに使う声のタイプを選びます。端末に入っている音声によって聞こえ方は変わります。',
    'settings.voiceAuto': '自動',
    'settings.voiceFemale': '女性寄り',
    'settings.voiceMale': '男性寄り',
  },
  'zh-TW': {
    'brand.subtitle': '讓日本和台灣的朋友更靠近。',
    'language.label': '顯示',
    'language.ja': '日本語',
    'language.zh': '台灣華語',
    'nav.home': '使用',
    'nav.compose': '製作',
    'nav.messages': '訊息',
    'nav.practice': '練習',
    'nav.saved': '保存',
    'page.home.title': '使用',
    'page.home.subtitle': '快速使用已準備好的句子',
    'page.compose.title': '製作',
    'page.compose.subtitle': '把想說的話整理成自然說法',
    'page.messages.title': '訊息',
    'page.messages.subtitle': '確認收到的文字，再做回覆',
    'page.practice.title': '練習',
    'page.practice.subtitle': '跟著念，確認容易聽懂的程度',
    'page.saved.title': '保存',
    'page.saved.subtitle': '常用說法可以馬上回看',
    'page.settings.title': '設定',
    'page.settings.subtitle': 'Taiwan Talk 的使用前提',
    'cta.listen': '聽',
    'cta.slow': '慢慢聽',
    'cta.slowListen': '慢慢聽',
    'cta.stop': '停止',
    'cta.largeDisplay': '放大顯示',
    'cta.practice': '練習',
    'cta.save': '保存',
    'cta.savePhrase': '保存',
    'cta.saved': '已保存',
    'settings.deviceCheck': '裝置檢查',
    'settings.deviceCheckDescription': '確認這台裝置是否可以使用音聲、錄音和保存。',
    'settings.speech': '音聲播放',
    'settings.recording': '錄音',
    'settings.microphone': '麥克風',
    'settings.storage': '保存',
    'settings.displayMode': '顯示模式',
    'settings.network': '連線狀態',
    'settings.speechTest': '音聲測試',
    'settings.recordingTest': '錄音測試',
    'settings.recheck': '重新確認',
    'settings.voiceSettings': '音聲設定',
    'settings.voiceDescription': '選擇朗讀時使用的聲音類型。實際聲音會依照裝置內建音聲而改變。',
    'settings.voiceAuto': '自動',
    'settings.voiceFemale': '女性寄り',
    'settings.voiceMale': '男性寄り',
  },
};

export function isDisplayLanguage(value: unknown): value is DisplayLanguage {
  return value === 'ja' || value === 'zh-TW';
}

export function readDisplayLanguage(): DisplayLanguage {
  if (typeof window === 'undefined') {
    return 'ja';
  }

  const storedValue = window.localStorage.getItem(DISPLAY_LANGUAGE_STORAGE_KEY);
  return isDisplayLanguage(storedValue) ? storedValue : 'ja';
}

export function writeDisplayLanguage(language: DisplayLanguage) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DISPLAY_LANGUAGE_STORAGE_KEY, language);
}

export function translate(language: DisplayLanguage, key: TranslationKey) {
  return translations[language][key];
}
