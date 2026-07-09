# Deploy

## Local check

```bash
npm install
npm run build
npm run qa:flow
npm run qa:screenshots
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
```

- `OPENAI_API_KEY`: server-side OpenAI API key. Do not commit it and do not expose it as a `VITE_` variable.
- `OPENAI_MODEL`: optional model override for the AI generation route.
- `AI_GENERATION_ENABLED`: set to `true` only when the API key is configured and AI generation should be used.

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
```

Published Phase 1 app:

```bash
BASE_URL=https://taiwan-talk.vercel.app npm run qa:flow
```

PowerShell:

```powershell
$env:BASE_URL="<Vercel URL>"
npm run qa:flow
```

Published Phase 1 app:

```powershell
$env:BASE_URL="https://taiwan-talk.vercel.app"
npm run qa:flow
```

Latest production QA result: run `BASE_URL=https://taiwan-talk.vercel.app npm run qa:flow`.
