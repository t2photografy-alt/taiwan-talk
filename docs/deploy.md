# Deploy

## Local check

```bash
npm install
npm run build
npm run qa:flow
npm run qa:screenshots
npm run qa:tts
```

## Git

```bash
git init
git add .
git commit -m "Initial Taiwan Talk phase 1 app"
```

## GitHub

```bash
git branch -M main
git remote add origin <GitHub repository URL>
git push -u origin main
```

## Vercel CLI

```bash
npm i -g vercel
vercel login
vercel
vercel --prod
```

## Vercel settings

```txt
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

## Vercel Environment Variables

Set these in Vercel Project Settings → Environment Variables.

```txt
OPENAI_API_KEY=
OPENAI_MODEL=
AI_GENERATION_ENABLED=true
OPENAI_TTS_ENABLED=true
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE_SOFT=marin
OPENAI_TTS_VOICE_CALM=cedar
```

- `OPENAI_API_KEY`: server-side OpenAI API key. Do not commit it and do not expose it as a `VITE_` variable.
- `OPENAI_MODEL`: optional model override for the AI generation route.
- `AI_GENERATION_ENABLED`: set to `true` only when the API key is configured and AI generation should be used.
- `OPENAI_TTS_ENABLED`: set to `true` to make OpenAI TTS the primary read-aloud provider.
- `OPENAI_TTS_MODEL`: speech model override. The default is `gpt-4o-mini-tts`.
- `OPENAI_TTS_VOICE_SOFT` / `OPENAI_TTS_VOICE_CALM`: server-side voice IDs for the two UI styles. The defaults are `marin` and `cedar`.

Recommended scope:

- Production: set when enabling AI generation on https://taiwan-talk.vercel.app/
- Preview: set only when testing AI generation before production
- Development: optional; local Vite can continue to use mock fallback without these values

If the API key is missing or AI generation is disabled, `/api/conversation/generate` returns a safe error and the frontend falls back to the existing mock generation.

## Production QA

Production URL:

```txt
https://taiwan-talk.vercel.app/
```

```bash
BASE_URL=<Vercel URL> npm run qa:flow
BASE_URL=<Vercel URL> npm run qa:ai-generation
BASE_URL=<Vercel URL> npm run qa:tts
```

Published Phase 1 app:

```bash
BASE_URL=https://taiwan-talk.vercel.app npm run qa:flow
```

PowerShell:

```powershell
$env:BASE_URL="<Vercel URL>"
npm run qa:flow
npm run qa:ai-generation
npm run qa:tts
```

Published Phase 1 app:

```powershell
$env:BASE_URL="https://taiwan-talk.vercel.app"
npm run qa:flow
```

Production release checks must include `qa:flow`, `qa:ai-generation`, and `qa:tts`. AI voice quality itself remains a human/device review item.
