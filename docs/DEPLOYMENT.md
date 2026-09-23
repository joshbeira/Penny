# Deployment

## Public beta on GitHub Pages

The public reader runs at [joshbeira.github.io/Penny](https://joshbeira.github.io/Penny/). `.github/workflows/deploy.yml` publishes the exact commit that passed CI on `main`. The Pages build sets `VITE_BASE_PATH=/Penny/` and `VITE_DISABLE_CLOUD_AI=true`; the site needs no secrets or backend. A copied `404.html` supports direct SPA links. Initial direct-route requests can return HTTP 404 while rendering the app; subsequent navigation and the installed PWA are client-side.

Enable GitHub Pages with **GitHub Actions** as the publishing source in repository settings. The workflow uses GitHub's short-lived deployment credentials. A successful CI run triggers deployment automatically.

## Frontend and functions on Vercel

Import this repository with the Vite preset. Use the repository root, `npm ci`, `npm run build`, and the `dist` output directory. `vercel.json` provides SPA routing while preserving `/api` routes. Use Node.js 22 or later. HTTPS is required for camera, service workers and Web Crypto.

The default deployment needs no secrets. It supports local OCR, text download, installed-device speech, sample interactions and local receipts. AI summaries remain unavailable unless explicitly enabled.

## Optional AI

Set these as server-side deployment variables, never `VITE_` variables:

```text
ENABLE_CLOUD_AI=true
GEMINI_API_KEY=<server-side key>
GEMINI_MODEL=gemini-3.1-flash-lite
```

The model is configurable; check the [official Gemini model catalogue](https://ai.google.dev/gemini-api/docs/models) for availability in the operator's account. Configure provider spending limits and platform-level request rate limits before exposing paid inference publicly. The application includes input limits and deadlines, but no distributed quota store or authentication. Setting `ENABLE_CLOUD_AI=false` is the immediate off switch.

For full-stack local development, install the Vercel CLI and use `vercel dev` with local environment settings. Plain `npm run dev` serves only the frontend. Copy `.env.example` when needed and never commit credentials.

## Release checklist

1. Run the checks listed in the README.
2. Review the current accessibility-tree changes before migrating baselines.
3. Verify a sample letter, a real synthetic image, a failed image and an unavailable AI endpoint.
4. Check mobile layout, keyboard access, speech stop/repeat and receipt deletion.
5. Allow the PWA to install, then reload offline and read a synthetic image.
6. Verify the deployment URL and report only checks actually completed.

Existing browser caches update through the PWA service worker. Reload after an update if an old screen is still visible.
