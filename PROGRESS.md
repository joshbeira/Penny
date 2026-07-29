P0 — complete; one verification item outstanding (see below)

Scaffold per SPEC §17 P0: §3 tree, §2 deps, Tailwind v4 via @tailwindcss/vite,
five routed screens, TabBar in §10 order, /api/tts 502 stub.

Structure decisions (agreed with the user; the spec was ambiguous on each):
- penny/ is both §3's app root and the git root (remote joshbeira/Penny, main).
  The outer portfolio_project/.git is vestigial and unused.
- Dev-only toolchain packages added beyond §2's table: @vitejs/plugin-react,
  @types/react, @types/react-dom, @types/node. §2's ban is on runtime deps and
  it already enumerates dev-only entries (playwright, sharp).
- All §3 directories created; only P0's files written. Later phases add their
  files at the exact §3 paths.
- Screens carry no <h1>: §10 puts the single h1 in the shared Header (P1).
  TabBar is built in §10 order so no DOM reordering is ever needed.

Verified:
- tsc --noEmit clean; npm run build ok (37 modules, 1.55s)
- Tailwind v4 compiled: every utility used is in the emitted CSS, @layer
  properties present, unused classes correctly absent (real content scanning)
- §2 versions resolved exactly as pinned (vite 6.4.3, react 18.3.1,
  react-router-dom 6.30.4, ts 5.9.3, tailwind 4.3.3, zustand 5.0.14,
  tone 15.1.22, tesseract.js 5.1.1, vite-plugin-pwa 0.21.2, sharp 0.33.5)
- Chromium at 390x844: TabBar navigates Home / Post Box / Receipts / Settings;
  /journey routed but absent from the TabBar; tap targets 98x48 (§4 min 48px);
  landmarks main + navigation present; zero console errors
- api/tts.ts handler returns 502 with {"ok": false}

Outstanding:
- `vercel dev` cannot start while §3 pins "dev": "vercel dev".
  @vercel/static-build's getCommand() gives a package.json dev script precedence
  over the framework's devCommand (its ignorePackageJsonScript escape hatch
  applies to "build" only), so the parent vercel dev spawns `npm run dev`, which
  re-enters vercel dev and trips its __VERCEL_DEV_RUNNING guard.
  Fix is Vercel Project Settings -> Development Command -> `vite --port $PORT`.
  No repo change; Framework Preset is already set to Vite.

Known dependency advisories (unfixable without moving §2's pins, so left alone):
sharp (libvips CVEs, dev-only, used once in P7 on an SVG we author) and
react-router-dom (open redirect via backslash in <Link>; Penny has no
user-controlled navigation targets). Remainder are transitive under
vite-plugin-pwa.

P1 — not started
