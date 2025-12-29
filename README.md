# Mortgage Scenario Comparator

A small React app to save and compare multiple mortgage scenarios for one property.

## Features
- Multiple scenarios stored in your browser (localStorage)
- Rate/points support decimals (e.g. 6.25%, 0.875 points)
- Property taxes, HOA, homeowners insurance: monthly or annual
- Optional PMI (flat amount)
- Compare table + remaining balance chart
- Export/import scenarios as JSON

## Run locally
```bash
npm install
npm run dev
```

## Build for production
```bash
npm run build
npm run preview
```

Build output is in `dist/`.

## Deploy
This is a static SPA. Deploy the `dist/` folder to:
- Netlify / Vercel (static)
- Cloudflare Pages
- S3 + CloudFront
