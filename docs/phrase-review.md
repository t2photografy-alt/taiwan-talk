# Taiwan Talk Phrase Review

## Review policy

- 台湾華語文言は現在ネイティブ確認前。
- `needsNativeCheck: true` のものは本番確定文言ではない。
- CodexやAIだけで自然さを確定しない。
- 友達向け、丁寧、イベント会場向けなど、用途ごとに自然さを見る。
- 日本語直訳ではなく、実際に相手に見せやすい表現を優先する。
- 修正時は `reviewStatus`、`naturalnessNote`、`reviewerNote` を更新する。

## Status Guide

- `draft`: 仮作成中。
- `needs-native-check`: ネイティブ確認待ち。
- `reviewed`: レビュー済みだが最終承認前。
- `approved`: 表示文言として承認済み。
- `rejected`: この用途では使わない。

## Presets

| ID | Scene | Japanese | Taiwanese Mandarin | Pinyin | Tone | Status | Note |
|---|---|---|---|---|---|---|---|
| `preset-see-you-long-time` | イベント会場で久しぶりに会った友達への声かけ | 久しぶり〜ほんと会いたかったよ！ | 好久不見～<br>真的很想見你耶！ | hao jiu bu jian<br>zhen de hen xiang jian ni ye | friendly | needs-native-check | 友達向けのカジュアル表現として仮置き。台湾華語としての自然さは要確認。 |
| `preset-want-see-again` | 別れ際やメッセージで、また会いたい気持ちを伝える | また会いたい！ | 我還想再見你！ | wo hai xiang zai jian ni | friendly | needs-native-check | ストレートな表現として仮置き。距離感や語尾の自然さは要確認。 |
| `preset-super-cool` | パフォーマンス後に相手を明るく褒める | すごい！めっちゃかっこいい！ | 好厲害！超帥的！ | hao li hai chao shuai de | event | needs-native-check | 勢いのある褒め言葉として仮置き。推し活/友達向けの温度感は要確認。 |
| `preset-thanks` | 友達や出演者へ軽く感謝を伝える | ありがとう〜！ | 謝謝你～！ | xie xie ni | friendly | needs-native-check | 短い感謝表現として仮置き。語尾のカジュアルさは要確認。 |
| `preset-photo-together` | 友達同士で一緒に写真を撮りたいと誘う | 一緒に写真撮ろう！ | 我們一起拍照吧！ | wo men yi qi pai zhao ba | friendly | needs-native-check | 友達向けの誘い文として仮置き。相手との距離感に合うか要確認。 |
| `preset-may-photo` | 写真撮影の許可を相手や場に確認する | 写真を撮ってもいいですか？ | 可以拍照嗎？ | ke yi pai zhao ma | polite | needs-native-check | 許可取りの短い表現として仮置き。より丁寧な言い方が必要な場面は要確認。 |
| `preset-performance-great` | イベントやライブ後にパフォーマンスを褒める | 今日のパフォーマンス、本当に最高でした！ | 今天的表演真的太棒了！ | jin tian de biao yan zhen de tai bang le | event | needs-native-check | イベント後の褒め言葉として仮置き。表演/演出など語の選び方は要確認。 |
| `preset-learning` | 自分が台湾華語を勉強中であることを伝える | 台湾華語を少し勉強しています | 我有在學一點台灣華語。 | wo you zai xue yi dian tai wan hua yu | friendly | needs-native-check | 学習中であることを伝える仮文。台灣華語という呼び方の自然さは要確認。 |
| `preset-next-year` | イベントの別れ際に、来年も会いたいと伝える | また来年も会いたいです | 明年也想再見到你。 | ming nian ye xiang zai jian dao ni | polite | needs-native-check | 少し丁寧な別れ際の表現として仮置き。相手との関係性に合うか要確認。 |

## Current Summary

- Total presets: 9
- `needsNativeCheck: true`: 9
- `reviewStatus: needs-native-check`: 9
- Approved presets: 0

## Review Notes

現時点では、上記の台湾華語文を自然・ネイティブ確認済みとして扱わない。修正候補が出た場合は、`docs/phrase-review-template.md` に沿って、元文、修正文、ピンイン、レビュー理由を残す。
