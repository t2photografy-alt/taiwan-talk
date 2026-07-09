# AI生成品質QA

Taiwan Talk のAI生成は、まだ品質完成やネイティブ確認済みとして扱わない。
このドキュメントは、実際の入力パターンに対して生成結果のズレ、危ない表現、改善候補を見える化するためのQA観点とケース一覧です。

## 評価観点

### Intent Match

入力意図と生成結果が一致しているかを見る。

- 写真を撮らせてほしい → 撮影許可・写真依頼になっているか
- また会いたい → 再会希望になっているか
- ありがとう → 感謝になっているか
- パフォーマンスを褒めたい → 褒め言葉になっているか

### Tone

指定トーンに合っているかを見る。

- `friendly`
- `polite`
- `casual`
- `event`
- `dm`

### Taiwanese Mandarin

- 繁体字で出ているか
- 簡体字になっていないか
- 台湾で見せても違和感が少ないか
- 中国大陸向けの硬い表現に寄りすぎていないか

### Pinyin

- 声調付きか
- `resultText` と対応しているか
- 不自然に抜けていないか

### Safety / Misleading

- 完成済み翻訳のように見せていないか
- `needsNativeCheck` が `true` か
- `reviewStatus` が `needs-native-check` か
- 政治的な表現へ寄っていないか
- 過度に恋愛っぽくなっていないか

### App Fit

- 対面でスマホ画面を見せやすいか
- SNS/DMで送っても違和感が少ないか
- 写真撮影前後のやりとりに使いやすいか
- 再会時の挨拶、お礼、軽い誘い、返信作成など複数シーンで使いやすいか
- イベント会場だけに限定された表現になっていないか
- 友達・知人・パフォーマー相手に距離感が重すぎないか

## テストケース一覧

### Compose cases

| ID | ケース | mode | sourceText | sourceLanguage | targetLanguage | tone | category | 期待 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C01 | 写真許可 | compose | また写真撮らせてください！ | ja | zh-TW | friendly | photo | 写真/撮影許可の意図を維持。`拍` / `照` / `照片` / `相片` のいずれかを含む可能性が高い。`好久不見` など再会挨拶に飛ばない。 |
| C02 | 一緒に写真 | compose | 一緒に写真撮れたら嬉しいです | ja | zh-TW | polite | photo | 一緒に写真を撮る依頼。丁寧すぎず、失礼でない。 |
| C03 | パフォーマンスを褒める | compose | 今日のパフォーマンス本当に最高でした！ | ja | zh-TW | event | event | `表演` / `演出` / `精彩` / `太棒` のような褒め表現。相手の性別に寄りすぎない。 |
| C04 | また会いたい | compose | また来年も会いたいです | ja | zh-TW | friendly | seeAgain | また会いたい/次も会いたい。過度に恋愛っぽくしない。 |
| C05 | お礼 | compose | 写真を撮らせてくれてありがとう！ | ja | zh-TW | friendly | thanks | 写真を撮らせてくれたことへの感謝。写真依頼ではなく、感謝になっている。 |
| C06 | 台湾華語を勉強中 | compose | 台湾華語を少し勉強しています | ja | zh-TW | friendly | greeting | `中文` / `台灣華語` など自然な言い方。自己紹介として自然。 |

### Message reply cases

| ID | ケース | mode | sourceText | sourceLanguage | targetLanguage | tone | replyIntent | 期待 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M01 | また遊ぼう | message-reply | 下次也一起玩吧～ | zh-TW | zh-TW | friendly | また会いたい | また会いたい/次も一緒に何かしたい返信。`下次` / `再` / `一起` / `見` / `玩` などの方向性。無関係な写真依頼に飛ばない。 |
| M02 | 写真ありがとう | message-reply | 謝謝你幫我拍照！ | zh-TW | zh-TW | friendly | うれしい | 喜び、こちらこそ、また撮りたい等。感謝に自然に返す。 |
| M03 | また来てね | message-reply | 明年也要來喔！ | zh-TW | zh-TW | friendly | また会いたい | 来年も行きたい/また会いたい。短く自然。 |
| M04 | 写真送る | message-reply | 可以傳照片給我嗎？ | zh-TW | zh-TW | friendly | 写真を送る | 写真を送る返答。`等一下` / `我傳給你` / `沒問題` などの方向性。 |

## 実行コマンド

```bash
BASE_URL=https://taiwan-talk.vercel.app npm run qa:ai-generation
```

PowerShell:

```powershell
$env:BASE_URL="https://taiwan-talk.vercel.app"
npm run qa:ai-generation
```

`BASE_URL` 未指定時は `http://127.0.0.1:5173` を使う。
APIが無効、API key未設定、またはローカルサーバー未起動の場合は、レポート上ではmock providerとして記録する。

## 自動判定方針

- 構造エラーは fail。
- API 500 は fail。
- `resultText` 空は fail。
- `needsNativeCheck` が `true` でない場合は fail。
- `reviewStatus` が `needs-native-check` でない場合は fail。
- `pinyin` なしは fail。
- 意図キーワード不足は warn。
- 自然さは自動で確定しない。
- warn があってもプロセスは exit 0。
- 最終判断は人間確認で行う。

## レポート出力

`npm run qa:ai-generation` は以下へMarkdownレポートを生成する。

```txt
outputs/ai-generation-qa/latest.md
```

`outputs/` は確認用生成物としてGit管理外です。
