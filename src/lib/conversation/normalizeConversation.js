const japaneseNuanceByTone = {
  friendly: '友達にそのまま送ったり、対面で伝えたりしやすい自然な言い方です。',
  polite: 'やわらかく丁寧に伝えたい場面で使いやすい言い方です。',
  casual: '親しい相手との会話やメッセージで使いやすい、くだけた言い方です。',
  event: '感想や気持ちを、対面でもメッセージでも伝えやすい言い方です。',
  dm: '友達へのメッセージや短い返信として使いやすい言い方です。',
};

const taiwanMandarinNuanceByTone = {
  friendly: '適合自然地傳給朋友，也適合面對面表達。',
  polite: '適合用柔和、有禮貌的方式傳達，也可以用在訊息或面對面對話。',
  casual: '適合和熟悉的朋友輕鬆聊天或傳訊息。',
  event: '適合用來分享感想，也可以在對話或訊息中自然表達。',
  dm: '適合傳訊息給朋友，也適合用來簡短回覆。',
};

function isTargetLanguageText(text, targetLanguage) {
  if (targetLanguage === 'ja') {
    return /[ぁ-んァ-ン]/.test(text);
  }

  return /[\u3400-\u9fff]/.test(text) && !/[ぁ-んァ-ン]/.test(text);
}

export function normalizeNuance(value, tone, targetLanguage, comparisonTexts = []) {
  const nuance = typeof value === 'string' ? value.trim() : '';
  const duplicatesExistingText = comparisonTexts.some(
    (text) => text?.trim() && text.trim() === nuance,
  );

  if (nuance && !duplicatesExistingText && isTargetLanguageText(nuance, targetLanguage)) {
    return nuance;
  }

  return targetLanguage === 'ja'
    ? japaneseNuanceByTone[tone]
    : taiwanMandarinNuanceByTone[tone];
}
