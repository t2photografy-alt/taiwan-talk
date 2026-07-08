# Taiwan Talk

Taiwan Talk is a Taiwan Mandarin and Japanese conversation support app for quickly creating, saving, showing, and practicing phrases.

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

The Phase 1 app intentionally keeps these areas mocked or pending final verification:

- AI generation
- Audio playback
- Recording
- Pronunciation analysis
- Native review of Taiwan Mandarin wording
