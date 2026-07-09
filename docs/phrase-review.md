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
| `preset-see-you-long-time` | イベント会場で久しぶりに会った友達への声かけ | 久しぶり〜ほんと会いたかったよ！ | 好久不見～<br>終於又見到你了，真的很開心！ | hǎo jiǔ bú jiàn<br>zhōng yú yòu jiàn dào nǐ le, zhēn de hěn kāi xīn | friendly | needs-native-check | 「会いたかった」を直訳せず、再会できて嬉しいニュアンスに寄せた一次修正。ネイティブ確認は引き続き必要。 |
| `preset-want-see-again` | 別れ際やメッセージで、また会いたい気持ちを伝える | また会いたい！ | 希望下次還能再見到你！ | xī wàng xià cì hái néng zài jiàn dào nǐ | friendly | needs-native-check | 別れ際やメッセージで自然に使いやすいよう、やわらかい表現へ一次修正。 |
| `preset-super-cool` | パフォーマンス後に相手を明るく褒める | すごい！めっちゃかっこいい！ | 好厲害！表演超精彩！ | hǎo lì hài! biǎo yǎn chāo jīng cǎi | event | needs-native-check | 相手の性別や距離感に寄りすぎないよう、パフォーマンス全般を褒める表現へ一次修正。 |
| `preset-thanks` | 友達や出演者へ軽く感謝を伝える | ありがとう〜！ | 謝謝你～！ | xiè xie nǐ | friendly | needs-native-check | 短い感謝表現として一次レビューでは大きな違和感なし。ネイティブ確認は継続。 |
| `preset-photo-together` | 友達同士で一緒に写真を撮りたいと誘う | 一緒に写真撮ろう！ | 我們一起拍張照吧！ | wǒ men yì qǐ pāi zhāng zhào ba | friendly | needs-native-check | 「写真を1枚撮ろう」の口語感を出すため、拍張照へ一次修正。 |
| `preset-may-photo` | 写真撮影の許可を相手や場に確認する | 写真を撮ってもいいですか？ | 請問可以拍照嗎？ | qǐng wèn kě yǐ pāi zhào ma | polite | needs-native-check | 許可取りとして丁寧さを少し足すため、請問を追加。 |
| `preset-performance-great` | イベントやライブ後にパフォーマンスを褒める | 今日のパフォーマンス、本当に最高でした！ | 今天的表演真的太棒了！ | jīn tiān de biǎo yǎn zhēn de tài bàng le | event | needs-native-check | イベント後の褒め言葉として一次レビューでは大きな違和感なし。表演/演出の選択はネイティブ確認で最終判断。 |
| `preset-learning` | 自分が台湾華語を勉強中であることを伝える | 台湾華語を少し勉強しています | 我有在學一點中文。 | wǒ yǒu zài xué yì diǎn zhōng wén | friendly | needs-native-check | 会話内では台灣華語より中文の方が自然なため一次修正。ただしアプリ上の説明では台湾華語表記を維持してよい。 |
| `preset-next-year` | イベントの別れ際に、来年も会いたいと伝える | また来年も会いたいです | 希望明年還能再見到你。 | xī wàng míng nián hái néng zài jiàn dào nǐ | polite | needs-native-check | 別れ際にやわらかく伝わるよう、希望...還能... の表現へ一次修正。 |

## Current Summary

- Total presets: 9
- `needsNativeCheck: true`: 9
- `reviewStatus: needs-native-check`: 9
- Approved presets: 0

## Review Notes

現時点では、上記の台湾華語文を自然・ネイティブ確認済みとして扱わない。修正候補が出た場合は、`docs/phrase-review-template.md` に沿って、元文、修正文、ピンイン、レビュー理由を残す。

## Phase 2C First Review Notes

- 直訳感や距離感が気になる表現を一部一次修正した。
- ピンインは声調記号付きへ更新した。
- `needsNativeCheck: true` と `reviewStatus: needs-native-check` は全プリセットで維持している。
- ここでの修正はAI一次レビュー反映であり、ネイティブ確認済みではない。
