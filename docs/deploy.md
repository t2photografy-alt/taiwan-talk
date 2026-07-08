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

## Production QA

```bash
BASE_URL=<Vercel URL> npm run qa:flow
```

PowerShell:

```powershell
$env:BASE_URL="<Vercel URL>"
npm run qa:flow
```
