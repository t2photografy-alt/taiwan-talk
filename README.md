# Taiwan Talk

Taiwan Talk is a Taiwan Mandarin and Japanese conversation support app for quickly creating, saving, showing, and practicing phrases.

It is not an event-only app. Event conversations are one representative use case, but the app is meant for short face-to-face conversations, SNS/DM replies, photo exchanges, greetings after meeting again, thanks, light invitations, gentle declines, and comments on performances or works.

## Phase 1 Status

- Production URL: https://taiwan-talk.vercel.app/
- Phase 1 status: Public QA completed
- `npm run build`: passed
- `npm run qa:flow`: passed
- `npm run qa:screenshots`: passed
- Production QA: `BASE_URL=https://taiwan-talk.vercel.app npm run qa:flow` passed

## Phase 2A Status

- Audio playback: browser `speechSynthesis` foundation added
- Recording: browser `MediaRecorder` recording foundation added
- Pronunciation analysis: still mocked after recording

## Phase 2B Status

- Taiwan Mandarin presets are managed with `needsNativeCheck` and `reviewStatus`
- Current preset wording includes draft phrases that still need native review
- Review targets are listed in `docs/phrase-review.md`
- Use `docs/phrase-review-template.md` when confirming, revising, or replacing phrases

## Phase 2C Status

- First-pass phrase review applied to the 9 presets
- Pinyin updated with tone marks for preset phrases
- `needsNativeCheck: true` and `reviewStatus: needs-native-check` are still maintained
- Phrase wording is still not native-approved

## Phase 2D Status

- PWA manifest was strengthened with portrait orientation and app icons
- Android device QA checklist added in `docs/android-device-qa.md`
- Settings now includes a device check for audio, recording, local storage, display mode, and network state
- Audio and recording behavior still depends on the browser and device
- Pronunciation analysis is still mocked

## Phase 2E Status

- Slow playback now uses a clearer slower rate than normal playback
- Playback buttons can be tapped again to stop the current speech
- Display language switching was added for key UI labels: Japanese / Taiwan Mandarin
- Voice type settings were added: auto / female-leaning / male-leaning
- Voice selection depends on the device's Web Speech API voices

## Phase 3A Status

- AI generation API foundation added with Vercel Functions
- The frontend calls `/api/conversation/generate` and never holds the OpenAI API key
- OpenAI API credentials are server-side environment variables only
- Missing or disabled API configuration falls back to the existing mock generation path
- Generated phrases are still marked as `needsNativeCheck` / `needs-native-check`
- Production deploy completed and `BASE_URL=https://taiwan-talk.vercel.app npm run qa:flow` passed with 8 tests

## Phase 3B Status

- Flow QA now supports variable AI generation results instead of fixed mock wording
- `npm run qa:flow` checks structure, save/display/practice flows, and review notices
- AI generation results remain `needsNativeCheck` / `needs-native-check`
- If the API is disabled, missing, or returns an off-intent result, the app falls back to mock generation

## Phase 3C Status

- AI generation quality QA cases are documented in `docs/ai-generation-qa.md`
- `npm run qa:ai-generation` collects generation samples from the configured API
- Reports are written to `outputs/ai-generation-qa/latest.md`
- Generation quality is still reviewed by humans; automated checks only flag structure and likely attention points

## Phase 3D Status

- AI generation samples are reviewed in `docs/ai-generation-review.md`
- `qa:ai-generation` is used to collect generation samples, while `ai-generation-review` is the human-readable first-pass review record
- The review keeps Taiwan Talk's app fit broad: face-to-face, SNS/DM, photo exchanges, greetings after meeting again, thanks, light invitations, gentle declines, and replies
- Even when a case is marked 仮OK, generated Taiwan Mandarin is not native-approved

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
npm run qa:ai-generation
```

`qa:flow` does not require generated phrases to match one fixed sentence. It checks the generated result card, Taiwan Mandarin-like text, save/display/practice routes, and the native-check notice so the same flow works with mock fallback and AI-enabled Production.

`qa:ai-generation` is for generation quality sampling. It posts the documented cases to `/api/conversation/generate`, checks structure and review flags, then writes a Markdown report under `outputs/ai-generation-qa/`. It is not a native-language approval step.

Human-readable first-pass review notes are kept in `docs/ai-generation-review.md`. Passing `qa:ai-generation` does not mean AI generation quality is finished.

To run the flow QA against a deployed URL:

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

`npm run qa:screenshots` writes review images to `outputs/visual-qa/`.

For Android manual QA, use `docs/android-device-qa.md`.

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

### AI generation environment variables

Set these in Vercel Project Settings → Environment Variables. Use Production for the public app, and optionally Preview / Development for test deployments.

```txt
OPENAI_API_KEY=
OPENAI_MODEL=
AI_GENERATION_ENABLED=true
```

- `OPENAI_API_KEY` must never be committed or exposed as a `VITE_` variable.
- `OPENAI_MODEL` is optional; the server function uses a code default when it is empty.
- If `AI_GENERATION_ENABLED` is not `true` or the API key is missing, the app falls back to mock generation.

## Current Mock Areas

The app intentionally keeps these areas mocked or pending final verification:

- AI generation: OpenAI API foundation is available, but generated wording is still under review and falls back to mock when disabled or off-intent
- Pronunciation analysis: still mocked
- Taiwan Mandarin wording: marked with `needsNativeCheck`
- Audio playback: implemented with browser `speechSynthesis`
- Recording: implemented as a browser `MediaRecorder` foundation
- Android/PWA support: browser and device dependent
- Display language wording: Taiwan Mandarin UI wording still needs native review
- Voice type selection: heuristic and device voice dependent
