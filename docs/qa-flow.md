# 実使用動線QA

## 実行コマンド

- `npm run build`
- `npm run qa:flow`
- `npm run qa:flow:headed`
- `npm run qa:screenshots`
- `npm run qa:ai-generation`

公開URLを対象にする場合:

```bash
BASE_URL=<Vercel URL> npm run qa:flow
BASE_URL=<Vercel URL> npm run qa:ai-generation
```

PowerShell:

```powershell
$env:BASE_URL="<Vercel URL>"
npm run qa:flow
npm run qa:ai-generation
```

## QAの役割

- `npm run build`：TypeScriptチェックと本番ビルド確認。
- `npm run qa:flow`：390px幅で実使用動線を自動検証。
- `npm run qa:flow:headed`：ブラウザ表示ありで実使用動線を確認。
- `npm run qa:screenshots`：主要画面の目視確認用スクリーンショットを `outputs/visual-qa/` に生成。
- `npm run qa:ai-generation`：AI生成サンプルを取得し、品質確認用レポートを `outputs/ai-generation-qa/latest.md` に生成。

## Codex報告に含めること

- `npm run build` の成功/失敗。
- `npm run qa:flow` の成功/失敗。
- `npm run qa:screenshots` の成功/失敗。
- `npm run qa:ai-generation` の成功/失敗と、注意ケースの数。
- 失敗したFlow名と、壊れていた導線。
- 390px幅での横はみ出し、下部ナビ、大きく表示画面、ボタン文字崩れの結果。
- ロゴ表示と禁止文言検査の結果。
- スクリーンショットの出力先。

## 現在の自動検証対象

- Flow A：使う画面から大きく表示して戻る。
- Flow B：作る、保存、保存画面で検索する。
- Flow C：保存、大きく表示、練習へ進む。
- Flow D：練習、発音チェックモック、苦手に保存する。
- Flow E：メッセージ意味確認、返信方針変更、保存、大きく表示へ進む。
- Flow F：左上メニューから設定へ進み、端末チェックと禁止文言が出ていないことを確認する。
- 端末チェック：設定画面で音声テスト、録音テスト、状態再確認UIが操作できることを確認する。
- 音声操作：聞く/ゆっくりを再タップして停止できることを確認する。
- 表示設定：日本語表示 / 台湾華語表示の切替と下部ナビラベルの変化を確認する。
- 音声設定：自動 / 女性寄り / 男性寄りの切替を確認する。
- AI生成土台：API keyがなくてもモックフォールバックで作る/メッセージ導線が通ることを確認する。
- AI生成注記：生成結果が確認前の表現である注記を確認する。
- 390px幅のレイアウトスモーク検査。

## AI有効時のQA方針

- AI有効時の生成結果は固定文言ではないため、`我們一起拍照吧！` のような完全一致を前提にしない。
- 作る画面では、生成結果カード、繁体字らしい本文、pinyin、確認前注記、保存導線を確認する。
- 写真依頼の入力では、生成本文に `拍` / `照` / `照片` / `相片` のいずれかが含まれることをゆるく確認する。
- 保存後は、テスト中に取得した生成本文を使って、保存画面、大きく表示、練習画面まで同じ内容を追跡する。
- メッセージ返信では、返信候補が空でないこと、繁体字らしいこと、返信方針に近い語が含まれること、保存と大きく表示ができることを確認する。
- APIが無効・未設定・意図外の結果を返す場合でも、モックフォールバックで同じ導線が通ることを前提にする。
- Productionでは `/api/conversation/generate` が200を返した場合、`needsNativeCheck: true` と `reviewStatus: needs-native-check` も確認する。

## AI生成品質QA

`qa:flow` は保存、表示、練習、メッセージ返信などの実使用導線を見る。
`qa:ai-generation` は、生成サンプルの品質確認材料を集める。

- 固定文言一致ではなく、構造、意図キーワード、確認前フラグを見る。
- `resultText`、`pinyin`、`needsNativeCheck`、`reviewStatus`、`meta.provider`、`meta.generatedAt` を確認する。
- 意図キーワード不足や自然さの懸念は warn としてレポートに残す。
- 自然さの最終判断は人間確認で行う。
- Production APIを対象にする場合は `BASE_URL=https://taiwan-talk.vercel.app npm run qa:ai-generation` を使う。
- APIが無効またはAPI key未設定のローカル環境では、mock providerとして記録できる。

## スクリーンショットQA

`npm run qa:screenshots` は以下を生成する。

- `outputs/visual-qa/00-home.png`
- `outputs/visual-qa/01-compose.png`
- `outputs/visual-qa/02-messages.png`
- `outputs/visual-qa/03-practice.png`
- `outputs/visual-qa/04-saved.png`
- `outputs/visual-qa/05-display.png`
- `outputs/visual-qa/06-settings.png`

目視では、正式ロゴ、表示言語切替、音声設定、端末チェック、ボタン文字、下部ナビ、カードの横はみ出し、大きく表示画面、設定画面の不要文言を確認する。

## Android実機QA

Android Chrome実機での音声、録音、保存、PWA表示の確認は `docs/android-device-qa.md` に沿って行う。
Playwrightでは本物のマイク許可や実音声の品質までは保証せず、設定画面の端末チェックUIが壊れていないことを中心に確認する。

## Phase 1 完了判定

- `npm run build` が成功する。
- `npm run qa:flow` が成功する。
- 主要画面スクショを確認できる。
- ロゴが正式画像になっている。
- ボタン文字崩れがない。
- オシカッツ関連文言がUI上に出ていない。
- AI・音声・発音解析がモックであることを把握している。
