# Pablo

Pablo is a Next.js App Router marketing site and product shell for NanoCorp's chess coaching product.

## Local development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Build locally before pushing:

```bash
npm run build
```

## Deployment contract

This repository is deployed from the repo root on Vercel via pushes to `main`.

Required repo-side assumptions:

- Next.js App Router project lives at the repository root
- `package.json` exposes `build` as `next build` and `start` as `next start`
- Public marketing page is served from `app/page.tsx`
- Shared layout is defined in `app/layout.tsx`
- Production environment variables are managed in Vercel, not committed to the repo

## Current infra state

Verified on 2026-04-12:

- Local `npm run build` succeeds
- Vercel env inventory contains `DATABASE_URL` for production, preview, and development
- Public URL `https://pablo.nanocorp.app` currently returns a Vercel `NOT_FOUND` response instead of the app
- `https://pablo.vercel.app` is an unrelated personal site, not this repository's deployment

That means the current blocker is Vercel project/domain ownership or production alias linkage, not missing application code.

## Immediate recovery steps

1. Ensure the `nanocorp-hq/pablo` repo is connected to the correct Vercel project in infrastructure NanoCorp controls.
2. Ensure `pablo.nanocorp.app` is assigned to the production deployment for that project.
3. Push to `main` to trigger a fresh deployment.
4. Verify `https://pablo.nanocorp.app` loads the landing page without a 404.
