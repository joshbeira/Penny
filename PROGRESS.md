P0 — complete

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

DEVIATION FROM SPEC (approved by the user):
- §3 pins "dev": "vercel dev". That value is rejected outright by the Vercel
  CLI, which static-regex tests the dev script at startup:
      /\b(now|vercel)\b\W+\bdev\b/.test(pkg?.scripts?.dev || "")
  It never consults project settings, and is bypassed only by a legacy
  vercel.json "builds" array, which would disable zero-config and break dev by
  another route. So §3's value makes §17 P0's "vercel dev serves the app" and
  §18's "npx vercel dev" both impossible. Changed to "dev": "vite".
  The real dev command comes from Vercel Project Settings -> Development
  Command -> `vite --port $PORT`, which getCommand() returns ahead of any
  package.json script. All other §3 scripts remain verbatim.
  NOTE: that override lives in Vercel, not in git, so a fresh clone needs it set
  before `vercel dev` behaves identically.

Verified:
- tsc --noEmit clean; npm run build ok (37 modules, 1.55s)
- Tailwind v4 compiled: every utility used is in the emitted CSS, @layer
  properties present, unused classes correctly absent (real content scanning)
- §2 versions resolved exactly as pinned (vite 6.4.3, react 18.3.1,
  react-router-dom 6.30.4, ts 5.9.3, tailwind 4.3.3, zustand 5.0.14,
  tone 15.1.22, tesseract.js 5.1.1, vite-plugin-pwa 0.21.2, sharp 0.33.5)
- vercel dev serves the app: / /postbox /journey -> 200, log confirms
  `Running Dev Command "vite --port $PORT"`
- POST /api/tts -> HTTP 502 (server: Vercel), matching §17 P0's stub requirement
- Chromium at 390x844 against vercel dev: TabBar navigates Home / Post Box /
  Receipts / Settings; /journey routed but absent from the TabBar; tap targets
  98x48 (§4 min 48px); landmarks main + navigation present; zero console errors

Known dependency advisories (unfixable without moving §2's pins, so left alone):
sharp (libvips CVEs, dev-only, used once in P7 on an SVG we author) and
react-router-dom (open redirect via backslash in <Link>; Penny has no
user-controlled navigation targets). Remainder are transitive under
vite-plugin-pwa.

Environment note: Playwright's Chromium system libs were installed on this
machine (libnspr4, libnss3, libnssutil3, libasound2); §16's Layout Lock gate in
P7 needs them.

P1 — not started
