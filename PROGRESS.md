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

P1 — complete

Shell, data and splash per SPEC §17 P1: §4 tokens, Header/SoundDot/LiveRegion/
Splash, TabBar restyled, Home on the §5 fixtures, Settings toggles persisted.
Body order is now §10 canonical on every route — header · main · nav · sr-only
live region — confirmed route by route with Playwright ariaSnapshot. This is the
tree P7 will baseline.

Decisions referred to the user (the spec was ambiguous or contradicted itself):
- Splash unlock depth. §17 P1 lists "Splash unlock flow (§6.1)", but §3 puts
  unlock() in lib/audio.ts, a P2 file. Agreed: P1 sets session.unlocked and
  navigates, and calls no audio API at all. Tone.start(), the 30ms silent buffer
  and speechSynthesis.cancel/resume land in P2 alongside greet and glance().
  "Nothing plays audio before the splash tap" is now provable by grep.
- session.ts persists to sessionStorage (key penny.session.v1). "First load of a
  session" reads as the browser session, so the splash survives full page loads
  within a tab. §16 needs this: it reaches each route with a full page load, and
  with in-memory session state §6.1's navigate-to-Home would silently make four
  of the five P7 baselines copies of Home. §19's "localStorage only" is read as
  backend-vs-client, not a ban on sessionStorage. Cost for filming: re-arming
  the splash needs a new tab, not a refresh.

Derived decisions (spec-silent; recorded rather than resolved silently):
- Persist key penny.settings.v1, following §9.2/§12.2's penny.{store}.v1.
- h1 titles for the four tabbed screens are their §10 screen names (= the TabBar
  labels); Journey's is §10's literal "One customer. Three years.". Journey gets
  its h1 now because the Header is shared and §15 wants one h1 per screen.
- Signed amounts render "-£42.30" / "+£12.00" (ASCII hyphen — no exotic glyphs
  in the baseline). Category tags are sentence case ("Groceries") per §4.
- The "Unusual" tag sits after the category tag, before the amount.
- Every row carries aria-label "{day}, {merchant}, {category}, {amount}", with
  ", unusual payment" appended on anomaly rows (§10 says "suffix").
- "This week" and "About Penny" are h2; one h1 per screen is preserved.
- accountHealth()/HEALTH_WORD live in data/account.ts so P2's glance() shares
  one implementation instead of re-deriving §7.1.
- Settings toggles reuse the aria-pressed pattern §10 fixes for the Header
  toggle; the track is aria-hidden so each name is exactly its label.
- Settings' journey link keeps "→" visible but aria-hidden, so the accessible
  name is "Sight-loss journey demo". Displayed copy is unchanged.
- Voice input defaults on. Demo mode is state only — the spec gives it a §12.2
  mirror toggle but never assigns it behaviour.
- Splash navigates with replace:true, so history holds no pre-unlock entry.
- PostBox/Receipts/Journey keep their P0 placeholders (P3/P4/P6).

Two defects verification caught and fixed:
- Splash was `fixed inset-0`, which left <body> zero height, so §16's "click
  body once (dismisses Splash)" could never click — Playwright times out on an
  invisible body. Now full-screen in normal flow (min-h-dvh). P7's gate depends
  on this.
- §4's font stack set only as Tailwind's --font-sans did not apply: preflight
  sets html's font-family from --default-font-family, which Tailwind
  tree-shakes, so it fell back to Tailwind's own stack. Declared in :root, which
  outranks preflight's `html` selector.

Tailwind v4 notes for later phases:
- Colour tokens keep their spec names in :root; @theme inline aliases them to
  --color-*. They cannot sit in @theme under the spec names — "--text-dim" would
  be read as a font-size named "dim". `inline` is required for theme vars that
  reference other vars.
- The 40px step is --text-amount, not --text-balance: text-balance is already a
  built-in text-wrap utility.
- Root font-size is 18px per §4's "18 body (root)", so 1rem = 18px and every
  pinned pixel value is written as a px literal (min-h-[48px], not min-h-12).
- Tailwind emits only theme vars whose utilities are used, so --text-health
  (64px, Journey 2030) appears in the CSS from P6.

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness):
- tsc --noEmit clean; npm run build ok
- no audio API in the bundle: Tone./speechSynthesis/new Audio/AudioContext/
  HTMLAudioElement all return zero hits, and tone is absent entirely
- all nine tokens emitted, font-size:18px, focus ring 3px amber at 2px offset,
  penny-pulse keyframes inside prefers-reduced-motion: no-preference
- splash: name "Open Penny", wordmark + dot + caption, no app chrome behind it;
  tap lands on Home; a new browser session re-arms it
- §10 order confirmed by ariaSnapshot on all five routes; exactly one h1 each;
  header order SoundDot(aria-hidden) · h1 · Quiet Mode
- after unlocking, /postbox /receipts /settings /journey load with no splash and
  snapshot their own trees, not Home's
- Home fixtures: "Current account" / "£1,842.60" / "Steady" / "British Gas £84
  due Wednesday"; 9 rows; t8 = "Sat, TicketPoint Ltd, Other, -£68.20, unusual
  payment" with the Unusual tag and a 3px amber left border
- Settings toggles survive reload via localStorage penny.settings.v1
- every tap target ≥ 48×48; focus ring computes to 3px solid rgb(255,183,3)
- axe: zero serious/critical violations on all five routes; zero console errors
- VITE_BREAK_LAYOUT=1 swaps Home to ["Play my week","Play the Glance"]; unset
  restores spec order

P2 — not started
