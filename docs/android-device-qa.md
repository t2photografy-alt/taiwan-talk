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

- 使う画面または練習画面で `聞く` を押す。
- `ゆっくり聞く` も押す。
- 設定画面の `音声テスト` を押す。
- 端末の音量、マナーモード、ブラウザの音声対応によって結果が変わる可能性がある。

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
- Note:

## Issues

## Next action
```

## 注意

- 音声再生と録音はブラウザと端末設定に依存します。
- 発音チェックは Phase 2D 時点では仮表示です。
- PWAのホーム追加可否や表示は、Android/Chrome/端末メーカーの仕様差を受けます。
