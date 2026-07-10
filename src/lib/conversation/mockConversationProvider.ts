import type {
  ConversationRequest,
  ConversationResult,
  MessageAnalysis,
  MessageReplyRequest,
} from './types';

export type ConversationProvider = {
  generate(request: ConversationRequest): Promise<ConversationResult>;
  analyzeMessage(text: string): Promise<MessageAnalysis>;
  createReply(request: MessageReplyRequest): Promise<ConversationResult>;
};

function resultForJapanese(request: ConversationRequest): ConversationResult {
  const normalized = request.sourceText.trim();
  const isThanks = normalized.includes('ありがとう') || normalized.includes('感謝');
  const isPhoto = normalized.includes('写真') || normalized.includes('撮');
  const isPraise =
    normalized.includes('かっこいい') ||
    normalized.includes('最高') ||
    normalized.includes('すごい');

  if (isThanks) {
    return {
      sourceText: normalized,
      resultText: '謝謝你～！',
      literalMeaning: '謝謝你。',
      pinyin: 'xie xie ni',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: request.tone,
      category: request.category,
      nuance: '短く、友達に向けたあたたかい感謝です。',
      readabilityScore: 90,
      alternatives: [
        {
          label: 'もっとラフ',
          resultText: '謝啦～！',
          pinyin: 'xie la',
          note: 'かなり近い相手向けです。',
        },
        {
          label: '少し丁寧',
          resultText: '真的很謝謝你。',
          pinyin: 'zhen de hen xie xie ni',
          note: 'しっかり感謝したい時に。',
        },
      ],
    };
  }

  if (isPhoto) {
    return {
      sourceText: normalized,
      resultText: '我們一起拍照吧！',
      literalMeaning: '我們一起拍照。',
      pinyin: 'wo men yi qi pai zhao ba',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: request.tone,
      category: request.category,
      nuance: '対面やSNS/DMで、自然に写真へ誘う言い方です。',
      readabilityScore: 83,
      alternatives: [
        {
          label: '許可を聞く',
          resultText: '可以拍照嗎？',
          pinyin: 'ke yi pai zhao ma',
          note: '相手や場所のルールを確認したい時に。',
        },
        {
          label: '少し丁寧',
          resultText: '可以跟你一起拍照嗎？',
          pinyin: 'ke yi gen ni yi qi pai zhao ma',
          note: '初対面に近い相手にも使いやすいです。',
        },
      ],
    };
  }

  if (isPraise) {
    return {
      sourceText: normalized,
      resultText: '今天的表演真的太棒了！',
      literalMeaning: '今天的表演非常精彩。',
      pinyin: 'jin tian de biao yan zhen de tai bang le',
      sourceLanguage: 'ja',
      targetLanguage: 'zh-TW',
      tone: request.tone,
      category: request.category,
      nuance: 'パフォーマンスや作品への感想として、よかった気持ちをまっすぐ伝える仮文です。',
      readabilityScore: 82,
      alternatives: [
        {
          label: 'もっとラフ',
          resultText: '超厲害的！',
          pinyin: 'chao li hai de',
          note: '短く勢いよく褒めたい時に。',
        },
        {
          label: '少し丁寧',
          resultText: '今天的演出真的很精彩。',
          pinyin: 'jin tian de yan chu zhen de hen jing cai',
          note: '落ち着いた褒め方です。',
        },
      ],
    };
  }

  return {
    sourceText: normalized || '久しぶり〜ほんと会いたかったよ！',
    resultText: '好久不見～\n真的很想見你耶！',
    literalMeaning: '很久不見，我真的很想見你。',
    pinyin: 'hao jiu bu jian\nzhen de hen xiang jian ni ye',
    sourceLanguage: 'ja',
    targetLanguage: 'zh-TW',
    tone: request.tone,
    category: request.category,
    nuance: '「很想見你」は、会いたかった気持ちをまっすぐ伝える表現です。',
    readabilityScore: 86,
    alternatives: [
      {
        label: 'もっとラフ',
        resultText: '好久不見欸～\n真的想見你！',
        pinyin: 'hao jiu bu jian ei zhen de xiang jian ni',
        note: '友達との距離が近い時に。',
      },
      {
        label: '少し丁寧',
        resultText: '好久不見，\n很想再見到你。',
        pinyin: 'hao jiu bu jian hen xiang zai jian dao ni',
        note: '落ち着いて伝えたい時に。',
      },
    ],
  };
}

function resultForTaiwaneseMandarin(request: ConversationRequest): ConversationResult {
  const normalized = request.sourceText.trim() || '謝謝你今天來看表演～';
  const isPlayAgain = normalized.includes('下次');
  const isPhotoThanks = normalized.includes('幫我拍照');
  const isComeNextYear = normalized.includes('明年');
  const isSendPhoto = normalized.includes('照片');
  const isHappyToday = normalized.includes('今天真的很開心');

  const resultText = isPlayAgain
    ? '次もまた一緒に遊ぼうね〜'
    : isPhotoThanks
      ? '写真撮ってくれてありがとう！'
      : isComeNextYear
        ? '来年も来てね！'
        : isSendPhoto
          ? 'あとで写真送るね〜'
          : isHappyToday
            ? request.tone === 'polite'
              ? '今日は本当に楽しかったです！'
              : '今日ほんと楽しかった！'
            : '今日は見に来てくれてありがとう〜';

  const pinyin = isPlayAgain
    ? 'xià cì yě yì qǐ wán ba'
    : isPhotoThanks
      ? 'xiè xie nǐ bāng wǒ pāi zhào'
      : isComeNextYear
        ? 'míng nián yě yào lái o'
        : isSendPhoto
          ? 'děng yí xià wǒ bǎ zhào piàn chuán gěi nǐ'
          : isHappyToday
            ? 'jīn tiān zhēn de hěn kāi xīn'
            : 'xiè xie nǐ jīn tiān lái kàn biǎo yǎn';

  const literalMeaning = isPlayAgain
    ? '次回も一緒に遊びましょう'
    : isPhotoThanks
      ? '写真を撮るのを手伝ってくれてありがとう'
      : isComeNextYear
        ? '来年も来てくださいね。'
        : isSendPhoto
          ? 'あとで写真を送ります。'
          : isHappyToday
            ? '今日は本当にうれしかった'
            : '今日は見に来てくれてありがとう';

  return {
    sourceText: normalized,
    resultText,
    literalMeaning,
    pinyin,
    sourceLanguage: 'zh-TW',
    targetLanguage: 'ja',
    tone: request.tone,
    category: request.category,
    nuance: '相手は来てくれたことへの感謝を、やわらかく伝えています。',
    readabilityScore: 88,
    alternatives: [
      {
        label: '自然な返信',
        resultText: 'こちらこそ、今日会えてうれしかったよ！',
        note: '友達に返す時の明るい日本語です。',
      },
      {
        label: '少し丁寧',
        resultText: 'こちらこそ、素敵な時間をありがとう。',
        note: '落ち着いた返信です。',
      },
    ],
  };
}

export const mockConversationProvider: ConversationProvider = {
  async generate(request) {
    if (request.direction === 'zh-TW-to-ja') {
      return resultForTaiwaneseMandarin(request);
    }

    return resultForJapanese(request);
  },

  async analyzeMessage(text) {
    return {
      sourceText: text.trim() || '謝謝你今天來看表演～',
      detectedLanguage: 'zh-TW',
      summaryJa: '今日は見に来てくれてありがとう、という感謝のメッセージです。',
      nuance: 'やわらかく親しみのある言い方です。返事も短く明るい温度感が合いそうです。',
      confidence: 0.82,
    };
  },

  async createReply(request) {
    const replies: Record<MessageReplyRequest['intent'], ConversationResult> = {
      happy: {
        sourceText: '今日会えてうれしかったよ！',
        resultText: '今天能見到你，我也很開心！',
        literalMeaning: '今天見到你，我很開心。',
        pinyin: 'jin tian neng jian dao ni wo ye hen kai xin',
        sourceLanguage: 'ja',
        targetLanguage: 'zh-TW',
        tone: request.tone,
        category: 'dm',
        nuance: '相手の感謝に、こちらのうれしさを返す自然な返信です。',
        readabilityScore: 84,
      },
      thanks: {
        sourceText: 'こちらこそありがとう！',
        resultText: '我才要謝謝你～！',
        literalMeaning: '我才應該謝謝你。',
        pinyin: 'wo cai yao xie xie ni',
        sourceLanguage: 'ja',
        targetLanguage: 'zh-TW',
        tone: request.tone,
        category: 'thanks',
        nuance: '「こちらこそ」の気持ちをやさしく返します。',
        readabilityScore: 86,
      },
      seeAgain: {
        sourceText: 'また会いたい！',
        resultText: '我還想再見你！',
        literalMeaning: '我還想再見到你。',
        pinyin: 'wo hai xiang zai jian ni',
        sourceLanguage: 'ja',
        targetLanguage: 'zh-TW',
        tone: request.tone,
        category: 'seeAgain',
        nuance: '次につなげたい気持ちを短く伝えます。',
        readabilityScore: 84,
      },
      askSchedule: {
        sourceText: '次はいつ会える？',
        resultText: '下次什麼時候可以見面？',
        literalMeaning: '詢問下次什麼時候能見面。',
        pinyin: 'xia ci shen me shi hou ke yi jian mian',
        sourceLanguage: 'ja',
        targetLanguage: 'zh-TW',
        tone: request.tone,
        category: 'dm',
        nuance: '予定を聞く時のストレートな仮文です。',
        readabilityScore: 79,
      },
      softDecline: {
        sourceText: '今回は行けないけど、また会いたいです',
        resultText: '這次沒辦法去，但還是很想再見你。',
        literalMeaning: '這次不能去，但還想再見面。',
        pinyin: 'zhe ci mei ban fa qu dan hai shi hen xiang zai jian ni',
        sourceLanguage: 'ja',
        targetLanguage: 'zh-TW',
        tone: request.tone,
        category: 'dm',
        nuance: '断りつつ、会いたい気持ちは残すやわらかい言い方です。',
        readabilityScore: 76,
      },
      sendPhoto: {
        sourceText: 'あとで写真を送るね！',
        resultText: '我等一下把照片傳給你！',
        literalMeaning: '晚一點會把照片傳給你。',
        pinyin: 'wo deng yi xia ba zhao pian chuan gei ni',
        sourceLanguage: 'ja',
        targetLanguage: 'zh-TW',
        tone: request.tone,
        category: 'photo',
        nuance: 'SNSやDMで写真を送る前に使いやすい返信です。',
        readabilityScore: 81,
      },
    };

    return replies[request.intent];
  },
};
