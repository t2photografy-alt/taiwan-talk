# Android Device QA

Taiwan Talk を Android Chrome 実機で確認するための手順です。Phase 2D 時点では Androidネイティブ化ではなく、PWA表示、音声再生、録音、保存、主要導線を実機で確認しやすくすることが目的です。

## Target URL

```txt
https://taiwan-talk.vercel.app/
```

## Recommended Environment

- Android 13 以降
- 最新版 Chrome
- 通常のモバイル通信または Wi-Fi
- マイク許可を確認できる端末

## Checklist

### 1. 起動

- `https://taiwan-talk.vercel.app/` を Android Chrome で開く。
- 使う画面が表示される。
- 正式だるまロゴがタイトル脇に表示される。
- 下部ナビが崩れていない。

### 2. ホーム追加 / PWA表示

- Chromeメニューから「ホーム画面に追加」を試す。
- ホーム追加後に起動し、表示モードが自然に見えるか確認する。
- 設定画面の「端末チェック」で、表示モードが `ホーム追加表示` または `ブラウザ` として表示される。

### 3. 音声再生

- 設定画面で `自然・やわらかめ` を選び、日本語 / 台湾華語をそれぞれ試聴する。
- `自然・落ち着いた声` を選び、日本語 / 台湾華語をそれぞれ試聴する。
- 2つの設定で実際に声が変わることを確認する。男性 / 女性は判定・保証しない。
- 使う画面または練習画面で `聞く` と `ゆっくり聞く` を押す。
- `聞く` を2回押すと停止する。
- `ゆっくり` または `ゆっくり聞く` を2回押すと停止する。
- 日本語がナレーションや接客音声のように機械的すぎず、友達との会話に近いか聞く。
- 台湾華語が不自然に音節を引き伸ばしていないか聞く。
- `ゆっくり` が自然なリズムを保ったまま通常より20〜25%程度ゆっくり聞こえるか確認する。
- 設定画面に `読み上げ音声はAIで生成されます。` が表示される。
- TTS APIを失敗させられる確認環境では端末音声へ切り替わり、フォールバック注記が表示される。
- 端末の音量、マナーモード、通信状態によって結果が変わる可能性がある。

### 3.1 日本語文章

- 台湾華語→日本語で、辞書的な逐語訳ではなく友達に送れる自然な文が主表示される。
- `friendly` / `polite` などのtoneが日本語の距離感に反映される。
- 原文より恋愛的、丁寧、強制的になっていない。
- `自然な日本語` と `原文に近い意味` が分かれている。
- `literalMeaning` は補助表示で、主結果より目立ちすぎない。

### 4. 録音

- 練習画面で `録音する` を押す。
- マイク許可ダイアログが表示される場合、許可する。
- `停止` を押して `録音できました` が表示される。
- `自分の音声を聞く` で録音音声を聞き返せるか確認する。
- 設定画面の `録音テスト` でも、録音開始、停止、聞き返しができるか確認する。

### 5. 保存

- 作る画面でフレーズを生成し、保存する。
- 保存画面に移動し、保存したフレーズが表示される。
- ページを再読み込みしても保存済みフレーズが残る。

### 6. 大きく表示

- 使う画面または保存画面から `大きく表示` を押す。
- 台湾華語が読みやすく表示される。
- 大きく表示画面では下部ナビが非表示になっている。
- 横スクロールや文字のはみ出しがない。

### 7. メッセージ

- メッセージ画面で `下次也一起玩吧～` などを入力する。
- `意味を確認` を押し、返信方針を選ぶ。
- 返信候補の保存と大きく表示ができる。

### 8. 設定 / 端末チェック

- 上部の表示言語切替で `台灣華語` に切り替えられる。
- 表示言語を `日本語` に戻せる。
- 設定画面で音声タイプを `自然・やわらかめ` / `自然・落ち着いた声` から選べる。
- 各音声タイプで日本語 / 台湾華語の試聴ができる。
- 設定画面で `端末チェック` が表示される。
- 音声再生、録音、マイク、保存、表示モード、通信状態が表示される。
- `音声テスト` が動く。
- `録音テスト` が動く。
- `状態を再確認` で表示が更新される。
- ページを開いただけでマイク許可を求められない。

## 記録テンプレート

```md
# Android Device QA Result

## Device

## Android version

## Chrome version

## Network

## Open URL

- [ ] OK
- [ ] NG

## Add to Home Screen

- [ ] OK
- [ ] NG
- Note:

## Speech

- [ ] Normal playback OK
- [ ] Slow playback OK
- [ ] Tap normal playback again to stop
- [ ] Tap slow playback again to stop
- [ ] Natural-soft voice tested in Japanese and Taiwan Mandarin
- [ ] Natural-calm voice tested in Japanese and Taiwan Mandarin
- [ ] The two voice styles sound different
- [ ] AI voice disclosure is visible
- [ ] Browser fallback notice appears when TTS fails
- Note:

## Recording

- [ ] Permission prompt OK
- [ ] Recording OK
- [ ] Playback recorded audio OK
- Note:

## Save

- [ ] Save OK
- [ ] Persists after reload
- Note:

## Display mode

- [ ] Large display readable
- [ ] Bottom nav hidden
- [ ] Display language can switch to Taiwan Mandarin
- [ ] Display language can switch back to Japanese
- Note:

## Issues

## Next action
```

## 注意

- 主音声はOpenAI TTSで生成され、失敗時だけブラウザのWeb Speech APIへフォールバックします。録音はブラウザと端末設定に依存します。
- 発音チェックは Phase 2E 時点でも仮表示です。
- PWAのホーム追加可否や表示は、Android/Chrome/端末メーカーの仕様差を受けます。
- 音声タイプは実voice IDを切り替えますが、男性/女性の性別や全端末で同じ聞こえ方を保証しません。
- AI音声と日本語会話文の自然さは自動QAだけでは確定せず、実機・人間確認を続けます。
- 台湾華語表示のUI文言は今後の確認対象です。
