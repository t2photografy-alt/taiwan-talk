# Taiwan Talk

Taiwan Talk is a Taiwan Mandarin and Japanese conversation support app for quickly creating, saving, showing, and practicing phrases.

## Phase 1 Status

- Production URL: https://taiwan-talk.vercel.app/
- Phase 1 status: Public QA completed
- `npm run build`: passed
- `npm run qa:flow`: passed
- `npm run qa:screenshots`: passed
- Production QA: `BASE_URL=https://taiwan-talk.vercel.app npm run qa:flow` passed with 7 tests

## Phase 2A Status

- Audio playback: browser `speechSynthesis` foundation added
- Recording: browser `MediaRecorder` recording foundation added
- Pronunciation analysis: still mocked after recording

## Phase 2B Status

- Taiwan Mandarin presets are managed with `needsNativeCheck` and `reviewStatus`
- Current preset wording includes draft phrases that still need native review
- Review targets are listed in `docs/phrase-review.md`
- Use `docs/phrase-review-template.md` when confirming, revising, or replacing phrases

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS v4
- Motion
- Playwright

## Development

```bash
npm install
npm run dev
```

The local app runs on the Vite URL shown in the terminal, usually `http://127.0.0.1:5173/`.

## Build

```bash
npm run build
```

## QA

```bash
npm run qa:flow
npm run qa:screenshots
```

To run the flow QA against a deployed URL:

```bash
BASE_URL=<Vercel URL> npm run qa:flow
```

PowerShell:

```powershell
$env:BASE_URL="<Vercel URL>"
npm run qa:flow
```

`npm run qa:screenshots` writes review images to `outputs/visual-qa/`.

## Deploy To Vercel

The app is a Vite SPA. `vercel.json` rewrites all routes to `index.html` so direct links such as `/compose`, `/saved`, and `/display/preset-see-you-long-time` do not 404.

Recommended Vercel settings:

- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

CLI flow:

```bash
vercel
vercel --prod
```

## Current Mock Areas

The app intentionally keeps these areas mocked or pending final verification:

- AI generation: still mocked
- Pronunciation analysis: still mocked
- Taiwan Mandarin wording: marked with `needsNativeCheck`
- Audio playback: implemented with browser `speechSynthesis`
- Recording: implemented as a browser `MediaRecorder` foundation
