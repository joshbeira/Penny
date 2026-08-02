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

P2 — complete

Sound and touch per SPEC §17 P2: lib/audio.ts (unlock + speak() + fixed-line
player + sound-dot state), lib/earcons.ts (glance + playWeek with the row-sync
callback), lib/haptics.ts (vibrate or WebAudio blips), the §6.1 splash sequence,
the live region actually mirroring, and Home's two buttons wired. Also
data/voiceLines.ts + scripts/voice-lines.json (§6.2 inventory; §14 names the
JSON the single source of truth so P7's generate-voice.mjs and the app share it).

Decisions referred to the user (SPEC §17's phase table contradicted §6.3/§11.3):
- Quiet Mode is gateway-only in P2. speak() mirrors to aria-live, plays no
  speech and returns; §6.3 step 2's TextCard render stays in P5, which §17
  assigns "Quiet matrix (§11.3), TextCards". A comment marks the seam.
- Splash order is §6.1's literal sequence, so `greet` is awaited before
  glance(). The Glance is therefore never heard over speech — which matters,
  because Appendix A beat 3 films exactly that moment. Visual consequence: App
  gates on session.unlocked and §6.1 flips it before greet, so the splash
  dismisses on tap and greet plays over Home. Keeping the splash up would mean
  re-architecting P1's gate, which §6.1 does not ask for.
- `quiet_on` (§11.3) defers to P5 with the rest of the Quiet matrix, so
  Header.tsx is untouched in P2. This overrides P1's note above, which expected
  it to land with audio.ts; §17 is the authority.

CRITICAL FINDING — tone must be dynamically imported:
  tone's index.js evaluates getContext() at module top level (its deprecated
  Transport/Destination/Master/Listener/Draw/context exports), and getContext()
  constructs a real AudioContext. The package does not declare
  `sideEffects: false`, so Rollup cannot drop them. A static
  `import * as Tone from "tone"` builds an AudioContext on page load — before
  the splash tap — breaking §6.1's "No audio API may be called anywhere before
  session.unlocked is true", the invariant P1 proved.
  So audio.ts loads Tone with `await import("tone")` inside unlock() and hands
  the module to earcons.ts/haptics.ts via ensureUnlocked(). Verified: zero
  AudioContexts on load, exactly one after the tap. It also splits Tone into its
  own 340 KB chunk, leaving a 186 KB entry.

Reload safety (a consequence of P1's sessionStorage decision):
  session.unlocked survives a full page load, so the splash is skipped and
  unlock() never runs on that page — yet Home's Glance button is right there.
  ensureUnlocked() therefore awaits unlock() rather than assuming it ran; every
  caller is inside a click, so Tone.start() still has its gesture, and unlock()
  is idempotent. Without this every audio call after a refresh would fail.

Derived decisions (spec-silent; recorded rather than resolved silently):
- audio.ts owns the live-region text as well as the sound-dot flag. §7.1/§7.2
  post their completion lines straight to aria-live — routing them through
  speak() would speak them — and audio.ts is the only non-component module both
  it and earcons.ts share. Both are consumed with React 18's
  useSyncExternalStore, so no fifth store file appears beside §3's four.
- The sound-dot flag is a refcount, not a boolean: §4 pulses the dot for speech
  *and* earcons, which are independent channels.
- LiveRegion renders its text in a `key`-ed inner span so replaying the Glance
  re-announces an identical string. The aria-live container never remounts.
- The 30ms silent buffer (§6.1) is a WAV data URI built at runtime and played
  through the *same* HTMLAudioElement speak() reuses — that element is what
  Android actually unlocks. §3's tree has no audio asset to ship instead.
- §7's −8 dB master is set at the end of unlock(): the first legal moment to
  touch Tone and the last before any earcon.
- The anomaly dyad is one PolySynth(Tone.Synth) over §7.1's motif voice. §7.1
  says "second synth at −4dB relative", and a mono Tone.Synth cannot sound two
  notes. The bill ping stays on the motif synth — only the anomaly tick is given
  a synth of its own.
- §8's "60ms apart" / "40ms apart" is the silent gap, not onset spacing: it
  mirrors the pause inside each vibration pattern (confirm is 80 on, 60 off, 80
  on, so its blips are 40 on, 60 off, 40 on).
- Blips do not pulse the sound-dot: §4 pulses it for speech and earcons, and a
  blip is standing in for a vibration.
- playWeek's onNote fires through Tone's Draw (rAF against the AudioContext
  clock, not Transport) so the row flash cannot drift; the anomaly haptic uses a
  timer instead, so a dropped frame cannot swallow the buzz.
- Composed aria-live lines spell counts as words and follow the spec's own
  casing: "Played seven days." mid-sentence, "One bill this week." at a
  sentence start.
- Every earcon creates its nodes per call and disposes them on a timer past the
  release tail (Glance +0.4s, playWeek +1s for the PluckSynth ring-out).
  Starting an earcon tears down the previous one, so double-tapping cannot
  double-schedule.
- speak() takes `text` over `lineText(id)` for the mirror when both are given
  (§11.1 step 8's read-back), so a screen reader hears "42 Lavender Grove", not
  "forty two".

SPEC CONTRADICTION, resolved by the acceptance criterion (not a free choice):
  §7.1 gates the anomaly tick on "any tx in the last 7 days", but the §5
  fixtures are dated 2026-07-06..12, so a wall-clock window is always empty and
  the tick could never fire — while §7.1's own closing line and §17 P2 both
  require "rising triad + bill ping + anomaly tick". The only reading that
  satisfies the acceptance criterion is that the WEEK array *is* the week:
  week.some(tx => tx.isAnomaly).

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness; the
WebAudio/speech/vibration surfaces were wrapped from outside so no debug hooks
were added to the shipped code):
- tsc --noEmit clean; npm run build ok; tone absent from the entry chunk
  (no ToneAudioNode/createOscillator/StereoPanner), present in the lazy chunk
- §6.1: 0 AudioContexts, 0 oscillators, 0 speechSynthesis calls and 1 JS chunk
  on load; after the tap exactly 1 AudioContext and 2 chunks
- greet reaches speechSynthesis as "Hi. I'm Penny.", lang en-GB, rate 1 — the
  expected path with no MP3s recorded and /api/tts still the 502 stub
- Glance note-for-note: C4@0, E4@0.22, G4@0.44 (triangle), A5@0.72,
  C5+F#5@0.95 — audible span 1.07s, inside §7.1's 2s. Three native oscillators
  (Tone.Synth is monophonic and carries all four motif notes on one; the dyad's
  PolySynth allocates two voices)
- identical note schedule across three consecutive replays
- playWeek: onsets 0 · 0.12 · 0.629 · 0.749 · 1.257 · 1.886 · 2.514 · 3.143
  (+dyad 3.193 ×2) · 3.771, i.e. 0.3 + 4.4×day/7 with +0.12 same-day and the
  dyad +0.05; 9 panners with credits at −0.7 ×2 and debits at +0.7 ×7; timbres
  triangle ×2 + sine ×2 + square + sawtooth, plus 3 PluckSynth buffer sources
- all 9 rows flash in array order, TicketPoint at 3.134s after the first
- aria-live: "Steady. One bill this week. One unusual payment." and
  "Played seven days. One unusual payment on Saturday."
- haptics never both: with navigator.vibrate present, [40,40,40,40,40] once and
  no 1600Hz blip; with it removed, no vibrate call and three 1600Hz sine blips
  70ms apart. Note desktop Chrome *defines* navigator.vibrate (a no-op without
  hardware), so the dev machine correctly gets silence — the blip branch is
  reachable only by removing it, which is how it was tested
- Quiet Mode: Glance still plays all six notes, zero speech, live region still
  carries the line; a fresh session in Quiet Mode skips greet entirely
- disposal: one Glance issues 148 disconnects, ten issue 1480 — linear, no
  accumulation
- sound-dot gains .sound-dot--speaking during playback (computed animation
  penny-pulse) and loses it after
- reload safety: after a refresh the splash is skipped and the Glance still
  plays all six notes, no page errors
- no regression: landmark order banner · main · navigation · status and exactly
  one h1 on all five routes, zero serious/critical axe violations, every tap
  target ≥ 48×48, zero console errors
- VITE_BREAK_LAYOUT=1 renders ["Play my week","Play the Glance"]; unset renders
  the §10 order

Not verified here (needs real hardware, before filming): that speechSynthesis
is actually audible and intelligible on the target Android device, and that
navigator.vibrate produces the intended patterns. Headless Chromium ships no
voices and no vibration motor, so the harness asserts the call sites, not the
output.

TWO ITEMS FOR LATER PHASES (recorded, deliberately not acted on in P2):
- §13.2's real /api/tts is unassigned. No phase in §17 claims the ElevenLabs
  implementation — P0 built the 502 stub, P2 needs only that stub, and P7 covers
  the *script* (§14), not the function. It has to land somewhere before filming
  or Penny never uses the ElevenLabs voice at runtime.
- P2 creates a P7 Layout Lock hazard. §16's walk clicks body to dismiss the
  Splash, which now triggers greet and the Glance, which post text into the
  aria-live region — and ariaSnapshot captures it. Measured on /postbox: the
  status region is "" at networkidle and
  "Steady. One bill this week. One unusual payment." three seconds later. §16
  snapshots at networkidle, so today it captures the empty region, but that is a
  race, not a guarantee. P7's check.mjs needs a deterministic answer (settle-wait
  or audio suppression).

P3 — complete

Post Box per SPEC §17 P3: data/letters.ts (§5.3), lib/capture.ts + lib/ocrMask.ts
(§11.1 steps 1–2), the armed-fixture/API/fallback logic and three reading modes
in screens/PostBox.tsx (§10, §11.1), components/ConfirmSheet.tsx (§9.1), and the
receipt write on lib/hash.ts + state/receipts.ts (§9.2). Also api/read-letter.ts
(§13.1) and state/director.ts's armedLetter (§12.2).

Decisions referred to the user (§17 assigns these to no phase, or the spec
contradicts itself):
- api/read-letter.ts is built here, verbatim from §13.1. §17 names no owner —
  the same gap P2 recorded for §13.2's tts — but P3 owns its only caller (§11.1
  step 3). With no ANTHROPIC_API_KEY it returns an immediate 502, which is
  §13.1's specified behaviour and the path §11.1 step 4 is built for.
- §9.2 lands whole (store + addReceipt + verifyChain). P3 needs addReceipt for
  step 8; splitting a six-line function across phases buys nothing. P4 adds only
  the list UI, verify banner, chain_ok, read-aloud and the director's seed/reset.
- The tesseract runtime assets are committed to public/tesseract/ (~11 MB).
- state/director.ts now, panel in P6, plus a temporary Settings control.

SPEC CONTRADICTION, resolved with the user (not a free choice):
  §12.3 D and §17 P3 both require `read_fallback` in scenario D (armed "PIN",
  airplane mode), but §11.1 step 3 skips the network whenever armedLetter is not
  "live" — so step 4's failure branch, the only thing that plays that line, is
  unreachable on every armed path. The reading that satisfies §12.3 A, §12.3 D
  and P3's acceptance criterion together is that the difference between A and D
  is the one the spec itself states: A is labelled "online", D is labelled
  "Airplane mode". So the line is gated on navigator.onLine, not on the arming,
  and still no request is made.

CRITICAL FINDING — tesseract.js does not bundle itself:
  5.1.1 fetches all three runtime assets from jsdelivr by default — worker.min.js
  (worker/browser/defaultOptions.js), the core (worker-script/browser/getCore.js)
  and eng.traineddata (worker-script/index.js:129) — and @tesseract.js-data/eng
  is not installed at all. §12.3 D runs in airplane mode and asserts "tesseract
  is bundled", so all three are served from our own origin out of
  public/tesseract/ via workerPath/corePath/langPath.
  Both LSTM core variants ship because getCore() feature-detects SIMD and picks
  the filename itself. Only the .wasm.js glue files are needed: they embed the
  binary as base64 and reference no sibling .wasm, which halves the payload.
  The files stay in public/ rather than being ?url-imported — Vite would hash
  them, and corePath must address a directory.

Derived decisions (spec-silent; recorded rather than resolved silently):
- maskedCount is `number | null`. §11.1 step 2 outputs `{maskedBlob,
  maskedCount}`, but §10's chip must distinguish "0 items hidden on device" from
  "Masking unavailable"; null carries the second state without adding a field.
- A thrown OCR error takes the timeout branch. §11.1 names only the 10s timeout,
  but a worker that fails to load means the same thing to the user, and
  "Masking unavailable" is already §10's chip for it.
- ocrMask.ts keeps recognition and drawing separate, so the canvas is written
  synchronously only after the 10s race settles. A recognise call that finishes
  late therefore cannot paint over an image already encoded and sent.
- The worker is started on mount and never terminated. §11.1 fixes creation and
  says nothing about teardown; tearing down on tab-change would re-instantiate
  ~4 MB of wasm every time the user returns to Post Box.
- ConfirmSheet's `actionLabel` names the dialog. §9.1 lists it as a prop but
  gives the button itself the literal label "Confirm", and §4 wants one name per
  action all the way through.
- The sheet holds a one-decision guard: without it a fast double-tap *on* the
  Confirm button fires the button's onClick and then the sheet's double-tap
  detector — two confirms, two receipts.
- Receipt ids come from crypto.randomUUID(), available in the same secure
  context sha256Hex already requires. §9.2 types `id` but never says its source.
- §10's chip is rendered on its literal template, so a count of 1 reads
  "1 items hidden on device". The spec pins the string; pluralising it would be
  inventing a decision.
- scam_alert speaks nothing in P3. §11.1 step 9 hands it to §11.4, which §17
  assigns to P5, so P3 does not speak a summary §5.3 calls superseded. Marked
  SEAM in the source.
- Masking runs even when a fixture is armed: steps 2 and 3 are sequential and
  step 2 is unconditional. It is what makes scenario D's chip count real.

TEMPORARY, MUST BE REMOVED IN P6:
  Settings carries an armed-letter radio group (§12.2's five labels), appended
  after "About Penny" so it reorders none of §10's Settings elements. §11.1 step
  3 reads director.armedLetter but §12.2's panel is P6, so without it neither
  filmed scenario could be reached. It must be deleted when DirectorPanel.tsx
  lands, BEFORE P7 writes any Layout Lock baseline.

Verified (390×844 Chromium; the fetch/speech surfaces were wrapped from outside,
so no debug hooks were added to the shipped code):
- tsc --noEmit clean; npm run build ok (1053 modules)
- §5.3: all 14 prose strings byte-identical to the spec, and card/nhs/pin
  summary_spoken match their §6.2 fixed-line texts exactly
- §13.1's SYSTEM_PROMPT is byte-identical to the spec (767 chars, compared
  programmatically rather than by eye)
- POST /api/read-letter with no ANTHROPIC_API_KEY → HTTP 502 {"ok":false}
- ORDERING PROOF (the privacy claim): with armed "live" the POST fires at
  1832ms, after masking opened at 908ms. The bytes that went over the wire were
  decoded and measured: 92,774 dark pixels and a 235px longest solid-black run,
  against 53,423 and 29px for the source prop — i.e. solid fillRect blocks the
  source does not have. Rendered, the PIN, all four card-number groups and the
  sort code are blacked out and the prose is untouched
- zero /api/read-letter calls when armedLetter !== "live", and masking still
  reports 7 items hidden
- scenario A (armed Card, online): summary_card → offer_card → action button →
  read-back announced with "42 Lavender Grove" → double-tap → exactly one
  receipt with §11.1 step 8's exact action/details/method and a genesis prevHash
  → done_receipt. No read_fallback while online
- scenario D (armed PIN, airplane mode flipped after the app is open, as §12.3 D
  and Appendix A beat 2 film it): 7 items hidden offline, read_fallback,
  pin_privacy, and no second summary after it
- fallback matrix on armed "live": the real 502, a 500, a 200 with invalid JSON,
  and an 8s abort each play read_fallback and land on the card fixture
- masking timeout: language data stalled past 10s → gave up at 10.3s, chip reads
  "Masking unavailable", the letter is still read
- chain: two receipts link prevHash→hash, hashes are 64 hex chars, verifyChain
  returns {ok:true}; hand-editing entry 1's details returns {ok:false,brokenAt:1}
- mode switch: fixed order Summary|Exact|Explain, Summary pressed on arrival,
  and each selection speaks its own text (summary_nhs by id, exact_text and
  explain_spoken through runtime TTS)
- ConfirmSheet: focus trapped inside the dialog, Escape cancels, focus returns
  to the invoking button, cancel_ok spoken, no receipt written
- §6.1 invariant intact with tesseract in the bundle: 0 AudioContexts and 0
  speechSynthesis calls before the splash tap, exactly 1 after
- no regression on all five routes: DOM order header·main·nav·div, aria order
  banner·main·navigation·status, exactly one h1, zero serious/critical axe
  violations, every tap target ≥48×48, zero console errors
- VITE_BREAK_LAYOUT=1 renders ["Play my week","Play the Glance"]; unset renders
  the §10 order (verified by rendering both builds — grepping the bundle is the
  wrong instrument, since the swap is a runtime array order and the string
  literals keep their source order either way)

Harness note: §16's walk must reuse ONE tab. session.unlocked lives in
sessionStorage, which is per-tab, so a fresh tab per route re-arms the Splash and
its navigate-to-Home turns four of the five baselines into copies of Home. This
is the hazard P1 recorded when it chose sessionStorage; P7's check.mjs has to
honour it.

THREE ITEMS FOR LATER PHASES (recorded, deliberately not acted on in P3):
- P6 must delete the temporary Settings control above.
- §14 pins includeAssets to ["audio/*.mp3", "icons/*"], and Workbox's default
  globs cover neither .wasm.js nor .traineddata.gz. Measured: a COLD start with
  the radios already off cannot mask — the chip reads "Masking unavailable" and
  only the fixture text is read. Scenario D as filmed is unaffected (the app is
  already open and §11.1 step 2's worker was created on mount), but P7's own
  criterion, "installed PWA passes scenario D offline", needs public/tesseract/*
  precached.
- P7 Layout Lock timing: §16's walk now visits /postbox, which starts the worker
  and pulls ~7 MB before networkidle. It settles, but it joins the aria-live race
  P2 already flagged as something check.mjs must answer deterministically.

P4 — complete

Receipts and chain per SPEC §17 P4: screens/Receipts.tsx (§10's screen, §11.5's
read-aloud), seedDemo in state/receipts.ts (§12.2), and unit tests locking §9.2's
sha256Hex and verifyChain. The store and the hashing themselves landed in P3 —
P3 needed addReceipt for §11.1 step 8 and declined to split a six-line function
across phases — so P4 adds no hashing code. The tests exist to LOCK it.

Decisions referred to the user (the spec was ambiguous or silent on each):
- Test runner. The repo had none, and §2 pins the stack while §19 bans added
  dependencies. Chose Node's built-in `node --test`: zero new packages, and Node
  24 strips TypeScript natively. Two costs, both accepted: state/receipts.ts's
  import of ../lib/hash gains a .ts extension, because Node's ESM loader does no
  extension search (allowImportingTsExtensions in tsconfig covers it, and Vite
  and esbuild resolve the explicit extension unchanged); and running the tests
  now needs Node ≥22.6 where §2 only promises ≥20. §3's pinned script list gains
  "test" — CLAUDE.md permits unit tests, and a test needs an entry point.
- §11.5's "auto". The template `"{Weekday}: {action}, confirmed by {method}."`
  with (method "auto" → "filed automatically") substituted literally produces
  "confirmed by filed automatically", which is not English and is spoken aloud
  (Appendix A beat 6). Agreed the whole clause is replaced:
  "Tuesday: Scam letter filed, filed automatically."
- The `#a3f9…` chip is aria-hidden. §10 lists it as a row element, but §15's
  TalkBack item 9 wants receipts to read as full sentences and a hex fragment is
  not one. It is a visual affordance for the tamper story, so it stays out of the
  accessibility tree — the same treatment Settings' "→", the Quiet toggle track
  and Post Box's masking bar already get.

Derived decisions (spec-silent; recorded rather than resolved silently):
- "Broken at entry {n}" prints brokenAt verbatim — the 0-based array index. §9.2
  names the field `index` and §17 P4 asks for "the exact broken index"; P3's own
  verification already speaks 0-based.
- The broken banner posts "Broken at entry {n}" through announce(), not speak():
  §10 gives a spoken line to the intact case only, and §7.1/§7.2 set the
  precedent that composed lines go straight to aria-live because routing them
  through speak() would speak them. Intact speaks chain_ok, which mirrors itself.
- Both banner glyphs (✓ ✗) are aria-hidden; the words carry the meaning.
- Method renders sentence-case (Double-tap, Auto), following Home.tsx's
  categoryLabel(), which capitalises tags citing §4's "sentence case everywhere".
- §11.5's {n} is a digit, while §7.1/§7.2's composed lines spell counts as words
  — each follows its own section's literal. A count of 1 therefore reads
  "1 receipts", exactly as P3 rendered §10's "1 items hidden on device": the spec
  pins the template and pluralising it would invent a decision.
- "{Weekday}" is the full name (Saturday), matching §7.2's own "One unusual
  payment on Saturday."
- "the latest ≤5" is read newest-first, matching §10's list order.
- One speak() per composed sentence; §6.3's queue exists for that sequencing.
- readReceiptsAloud() is exported from screens/Receipts.tsx so P6's §11.6
  "receipt" intent calls this implementation instead of composing its own. §3's
  tree has no module for it and a state module is the wrong home for spoken copy.
- seedDemo's card receipt takes method "double-tap". §11.1 step 8's method is
  whatever the user confirmed with, and §11.2 hard-codes "double-tap" for the
  analogous demo receipt. It appends rather than replacing — §12.2 lists "Reset
  receipts" as a separate control.
- Both Receipts buttons are 48px pills, not 56px: §10 names 56px explicitly where
  it wants it (Post Box's two buttons, §9.1's Confirm) and does not here.
- No UI for seedDemo/reset in P4. §12.2's panel is P6, and P3's temporary
  Settings control already owes a deletion before P7; adding a second one to
  delete would be worse than none.

FINDING — zustand reads window.localStorage, not the global:
  zustand v5 defaults to createJSONStorage(() => window.localStorage)
  (middleware.mjs:332). Node has no `window` at all, so the getter throws,
  createJSONStorage swallows it and persist silently drops to no storage,
  warning on every write. Stubbing globalThis.localStorage — which is what Node's
  own --experimental-webstorage would provide — does nothing. The test stub
  therefore hangs off `window`.

FINDING — one test was passing for the wrong reason:
  "rewriting the genesis prevHash breaks entry 0" still passed with verifyChain's
  prevHash link check disabled, because prevHash is itself part of the preimage,
  so editing it also breaks that entry's own digest. The link check was untested.
  Added "a re-hashed tamper is caught by the next entry's link": edit entry 1 and
  recompute its digest correctly, and only entry 2's prevHash catches it. That is
  the case that makes these receipts a chain rather than a checksum, and it is
  the only one that fails when the link check is removed.

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness; speech
was wrapped from outside, so no debug hooks were added to the shipped code):
- tsc --noEmit clean; npm run build ok (1053 modules, unchanged — the .ts import
  specifier resolves through Vite untouched); npm test 10/10
- the tests provably fail when they should: swapping two fields in §9.2's
  preimage fails "each hash is SPEC 9.2's pipe-joined preimage" (and only that
  test — the chain stays internally consistent, which is exactly why an external
  preimage assertion is needed); disabling the prevHash link check fails the
  re-hashed-tamper test
- §10 order on /receipts: Read my receipts · Verify chain · banner absent until
  run · list or empty state; body aria order still banner · main · navigation ·
  status, exactly one h1
- §17 P4's criterion, from outside: a valid 3-entry chain written straight into
  localStorage renders 3 rows and verifies "✓ Chain intact", with chain_ok
  reaching speechSynthesis as "Chain verified. No one has rewritten history."
  Hand-editing entry 0, 1 and 2 in localStorage gives "✗ Broken at entry 0", "1"
  and "2" respectively. (The row count is asserted before the intact banner: an
  empty chain also verifies intact, so without it the check would pass on a seed
  that never landed.)
- row rendering: "Replacement card ordered / Arriving in 5 working days to home
  address / Mon 6 Jul, 14:32 · Double-tap · #a841…0e9e" — §10's own example
  timestamp reproduced verbatim; list newest-first; the chip is absent from the
  aria snapshot and present on screen
- §11.5: "You have 3 receipts." then "Saturday: Card payment approved, confirmed
  by double-tap." / "Tuesday: Scam letter filed, filed automatically." /
  "Monday: Replacement card ordered, confirmed by double-tap." — composed at
  runtime through speak({text}), so via /api/tts and its speechSynthesis fallback
- with six receipts: one count line plus exactly five, newest-first, oldest
  omitted
- Quiet Mode: Read my receipts and Verify both speak nothing, the live region
  still carries every line, and the banner still renders
- the broken path posts "Broken at entry 1" to aria-live and speaks nothing
- seedDemo: writes exactly two, in §12.2's order, with payloads compared
  programmatically against the addReceipt calls extracted from SPEC.md itself
  (not retyped) — byte-identical including the U+00B7 in "Prize-draw pattern ·
  214 reports this month"; genesis prevHash on the first, the second linking to
  it, chain verifies; reset() empties it
- no regression on all five routes: zero serious/critical axe violations, every
  named control ≥48×48, zero JS errors. The only network failures in the whole
  walk are /api/tts 404s — §6.3 step 5's expected fallback path, since
  `vite preview` serves no /api and no fixed-line MP3s are recorded yet

Note for P7: §16 runs a fresh browser context, so penny.receipts.v1 is empty and
the EMPTY STATE is what gets baselined for /receipts.

FIVE ITEMS FOR LATER PHASES (recorded, deliberately not acted on in P4):
- §13.2's real /api/tts is still unassigned to any phase (P2's finding, unchanged).
  It has to land somewhere before filming or Penny never uses the ElevenLabs voice.
- P6 must delete P3's temporary Settings armed-letter control BEFORE P7 writes any
  baseline. Its five radio inputs are also 20×20, the only sub-48px controls in
  the app; both problems go away together.
- P6's DirectorPanel is the only caller seedDemo and reset will ever have — they
  ship with no UI in P4.
- §14 pins includeAssets to ["audio/*.mp3", "icons/*"], which covers neither
  .wasm.js nor .traineddata.gz; P7's "installed PWA passes scenario D offline"
  needs public/tesseract/* precached (P3's finding, unchanged).
- P7's check.mjs still needs a deterministic answer to the aria-live race P2 and
  P3 flagged. P4 adds to it: the live region now also carries verify and
  read-aloud text, though only after a button press, so the route walk itself
  does not trigger it.

P5 — complete

Tap & Tell, Scam Shield and Quiet Mode per SPEC §17 P5: components/TapTellSheet.tsx
(§11.2), components/TextCard.tsx (§11.3), the scam flow in screens/PostBox.tsx
(§11.4), the text-card stack and enterQuietMode() in lib/audio.ts, director.ts's
two pushes (§12.2), and both mounts in App.tsx.

§11.3's matrix was already three rows out of four: earcons.ts and haptics.ts
never consulted quietMode, so the Glance, playWeek, vibration and the fallback
blips have been surviving Quiet Mode since P2. P5's only matrix code is the
TextCard render and `quiet_on`; the rest of §11.3 was a verification job.

Decisions referred to the user (in each case the spec states two things; all
four were resolved on the strict reading):
- `quiet_on` ordering. §11.3 says toggling ON "plays quiet_on as the final
  spoken line", but §6.3 step 2 suppresses without exception. Agreed: speak it,
  THEN raise the flag — the only ordering that leaves the line audible, and
  literally what "final" means. Cost, accepted: the toggle's aria-pressed and
  amber fill lag the tap by the length of the line (~2s), which Appendix A beat
  3 films. Rejected alternative: an escape hatch inside speak(), which §6.3
  step 2 admits none of.
- Scam Summary replay. §11.1 step 6 says "Summary → summary_spoken", while §5.3
  calls the scam fixture's summary_spoken "superseded in the UI by the fixed
  scam_filed line" and §11.4 says that line "replaces the summary". Agreed:
  scam_filed IS that letter's summary — the first reading and every replay from
  the mode switch. Consequence: SCENARIOS.scam.summary_spoken is now spoken
  nowhere in the app; it survives only as fixture data.
- TapTellSheet has no Confirm button. §11.2's contents list is merchant · amount
  · "Double-tap to approve" region · Cancel, where §9.1 gives ConfirmSheet a
  56px Confirm button. Agreed: exactly §11.2's four elements. That is also why
  §11.2 hard-codes the receipt's method as "double-tap" — there is no other way
  to approve. Recorded consequence: approve is unreachable by keyboard or
  switch, and focus lands on Cancel on open, the only focusable element. A real
  §15 gap, entered deliberately rather than papered over.
- TextCard keeps role="status". §11.3 pins the role and §6.3 step 1 mirrors
  every string to the live region, so in Quiet Mode each line reaches a screen
  reader twice. §15's TalkBack item 5, "announced once, not repeatedly", is read
  as: the card must not re-announce on re-render or timer tick. Flagged for the
  pre-filming TalkBack pass, where it gets judged on the device.

Derived decisions (spec-silent; recorded rather than resolved silently):
- enterQuietMode() lives in lib/audio.ts. Both §10's Header toggle and §10's
  Settings row turn the same setting on, so the speak-then-flip sequence needs
  one home; the gateway that owns the suppression owns the exception to it, and
  putting it there avoids a settings.ts → audio.ts → settings.ts import cycle.
  It carries its own re-entrancy guard, so taps landing inside the line cannot
  queue a second `quiet_on`.
- The card stack sits in audio.ts beside `announce`, consumed with
  useSyncExternalStore — P2's precedent, so no fifth store appears beside §3's
  four. The array is swapped rather than mutated, since useSyncExternalStore
  compares snapshots by identity.
- speak() does not await the card. §6.3 step 2 says *return*, and §11.3 says
  cards *stack*, so a burst puts one card up per line at once — §11.5's
  read-aloud can raise six. No cap is invented.
- The TextCard host renders null when the stack is empty, not an empty wrapper,
  and TapTellSheet exists only while a push is pending. Neither is therefore
  visible to §16's route walk.
- Dialogs outrank status cards: cards z-20, sheets z-30 (ConfirmSheet moved off
  z-10). In Quiet Mode a ConfirmSheet's own read-back becomes a card, and a
  modal must never end up underneath one.
- pendingTap is not persisted. §12.2 persists the director, but a pending push
  surviving a reload would raise a payment sheet on load with nothing behind it,
  so partialize keeps armedLetter only — the shape receipts.ts already uses.
- TapTellSheet fires haptic("attention") in its own mount effect rather than in
  the pushing control, so P6's DirectorPanel inherits it. ConfirmSheet already
  owns its on-open speak(readback); this is the same shape.
- In Quiet Mode TapTellSheet mirrors its line with announce(), not speak().
  §11.2 says "the sheet is the text card", so going through the gateway would
  stack a second card on top of a sheet already showing the same thing. §7.1/7.2
  set the precedent for posting straight to aria-live.
- The sheet's accessible name is "Approve card payment" — §11.2 gives none, and
  this names the outcome (§4) in the action-name family of the receipt it writes.
- The Quiet caption row goes last, after Cancel, so it displaces none of §11.2's
  four listed elements.
- §9.1's dialog behaviour (focus first focusable, restore the invoker, Escape,
  Tab trap) was extracted into useDialogSheet(), exported from ConfirmSheet.tsx
  and used by both sheets. "TapTellSheet follows the same dialog rules" is then
  true by construction rather than by copy, and no module appears outside §3's
  tree — the precedent P4 set with readReceiptsAloud.
- §11.4's "danger 'Suspected scam' tag" is the existing tag restyled, not a new
  element: §5.3 already gives the scam fixture letter_type "Suspected scam",
  which §10 already places. So the scam card adds exactly one element to §10's
  order — the "Receipt saved" footer, and only on a scam result.
- The scam receipt is written without awaiting scam_filed. The write is silent
  and invisible, so making it wait ~3s for the line buys nothing, and the order
  the user perceives is still §11.4's.
- No animation on the cards. §4's motion rule binds animation that is added;
  adding none is simpler than wrapping one in prefers-reduced-motion.
- No new unit tests. P4's node --test covers §9.2's pure logic; everything P5
  adds is DOM and side-effects, and is verified in the browser instead.

FINDING — the splash Glance overwrites the live region ~1.5s after unlock:
  §6.1 ends by running glance(), and §7.1 posts its completion line on a timer
  after the earcon. Any aria-live assertion made in that window is silently
  overwritten by "Steady. One bill this week. One unusual payment." — measured
  here at 1043ms after the tap, against a scam flow that completed at 595ms.
  This is P2's race met head-on rather than in theory. The harness waits the
  line out before asserting anything; P7's check.mjs still needs a deterministic
  answer, and this is now the third phase to say so.

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness; the
speech, vibration and WebAudio surfaces were wrapped from outside, so no debug
hooks were added to the shipped code):
- tsc --noEmit clean; npm run build ok (1055 modules); npm test 10/10
- §6.1's invariant survives P5's new import of lib/audio into Header.tsx:
  0 AudioContexts and 0 speechSynthesis calls before the splash tap, exactly 1
  after. tone is still absent from the 220 KB entry chunk (no ToneAudioNode, no
  createOscillator) and present in the 336 KB lazy chunk
- scenario B end to end (Quiet ON, push Coffee): vibrate [400] on the push and
  [80,60,80] on approve · zero speechSynthesis calls throughout · the sheet
  carries "The Coffee House", "£4.85", the double-tap region, Cancel and the
  "Quiet Mode" caption, and Cancel is its only button · tap_coffee still reaches
  aria-live · no redundant card while the sheet is up · after the double-tap the
  card reads exactly "Approved. Receipt saved." (§6.2's payment_done — §12.3 B's
  "Approved · Receipt saved" is prose, not the string) · exactly one receipt
  with §11.2's payload and method "double-tap" · genesis prevHash · chain
  verifies intact
- the TicketPoint push on the speech path: tap_unknown spoken, no Quiet caption,
  payment_done spoken, receipt details "TicketPoint Ltd · £68.20"
- scenario C end to end (armed Scam): vibrate [40,40,40,40,40] · scam_filed
  spoken and nothing else — no summary_spoken, no done_receipt · zero
  /api/read-letter calls · card background computes to
  oklab(… / 0.12), i.e. §11.4's 12%, and the tag to rgb(255,92,92) · the tag
  text is §5.3's letter_type · footer "Receipt saved" · masking still ran on the
  way through ("7 items hidden on device") · exactly one receipt whose payload
  is byte-identical to the addReceipt call extracted from SPEC.md itself, not
  retyped — including the U+00B7 — with method "auto"
- scenario C in Quiet Mode: the alert buzz still fires, zero speech, scam_filed
  lands as a text card and still reaches aria-live, the receipt is still written
- mode switch on the scam letter: Exact speaks the letter verbatim, Summary
  replays scam_filed
- §11.3's matrix, row by row, with Quiet ON: the Glance still sounds C4, E4, G4,
  A5, C5 and F#5 · playWeek still allocates nine panners with credits at −0.7
  (×2) and debits at +0.7 (×7) · vibration still fires · with navigator.vibrate
  removed, no vibrate call and the 800Hz attention blip still plays · zero
  speech in every case · the live region still carries every composed line
- `quiet_on`: the toggle speaks "Quiet Mode. I'll whisper." while the flag is
  still down, the button reads aria-pressed=true once the line ends, and the
  NEXT line is suppressed into a card — which is what makes it the final spoken
  line. Three taps dispatched inside one line queue exactly one `quiet_on`
- both sheets' dialog rules: focus moves inside on open, Tab stays trapped,
  aria-modal and an accessible name are present, Escape speaks cancel_ok and
  writes no receipt, and focus returns to the invoking button. P3's ConfirmSheet
  path was re-run whole (order card → read-back mirrored with "42 Lavender
  Grove" → double-tap → §11.1 step 8's payload) to prove the hook extraction is
  inert
- TextCard: role="status", 22px, background rgb(35,43,53) = --surface-raised,
  bottom edge above the TabBar's top edge, dismissed on tap, still up at ~4.3s
  and gone by ~6.5s
- no regression on all five routes: #root children header · main · nav · div,
  aria landmarks banner · main · navigation · status, exactly one h1, zero
  serious/critical axe violations, every button and link ≥48×48, zero console
  errors. The sheet and the card stack render nothing on every route, so P7's
  baselines are unaffected
- the only 404s in the whole walk are /audio/*.mp3 and /api/tts — §6.3 step 5's
  expected fallback path, since `vite preview` serves no /api and no fixed-line
  MP3s are recorded yet
- VITE_BREAK_LAYOUT=1 renders ["Play my week","Play the Glance"]; unset renders
  the §10 order (both builds rendered, not grepped)

Not verified here (needs the device, before filming):
- whether decision 4's double announcement is tolerable under real TalkBack.
  This is the one P5 decision that could still be wrong in practice, and §15's
  TalkBack pass is where it gets settled — the fix, if needed, is one attribute.
- that navigator.vibrate produces §8's patterns and that speechSynthesis is
  audible. Headless Chromium has no motor and no voices, so the harness asserts
  the call sites, not the output (unchanged from P2).

FIVE ITEMS FOR LATER PHASES (recorded, deliberately not acted on in P5):
- §13.2's real /api/tts is still unassigned to any phase in §17 (P2's finding,
  unchanged). It has to land somewhere before filming or Penny never uses the
  ElevenLabs voice at runtime.
- P6 must delete the temporary Settings control BEFORE P7 writes any baseline,
  and it is bigger now: five armed-letter radios AND §12.2's two push buttons,
  under the legend "Director (temporary — P6)". The pushes were added as 48px
  pills precisely so P4's "the radios are the only sub-48px controls in the app"
  stays true until the whole block goes.
- P6's DirectorPanel is the only caller seedDemo and reset will ever have; it
  now also owns armedLetter and both pushes, all of which already exist in
  state/director.ts.
- §14 pins includeAssets to ["audio/*.mp3", "icons/*"], which covers neither
  .wasm.js nor .traineddata.gz; P7's "installed PWA passes scenario D offline"
  needs public/tesseract/* precached (P3's finding, unchanged).
- P7's check.mjs still needs a deterministic answer to the aria-live race — see
  P5's finding above, which measures it rather than predicting it.

P6 — complete

Journey, Director and voice input per SPEC §17 P6: components/DirectorPanel.tsx
(§12.1 + §12.2), screens/Journey.tsx with Home's era prop and three preset class
sets in styles.css (§10), lib/voiceInput.ts + lib/intents.ts (§11.6), and the
deletion of all seven temporary Settings controls. Also, at the user's
direction and ahead of §17's own ordering: scripts/generate-voice.mjs (§14) and
the two P5 findings, which amend §15 and §16.

The fifteen MP3s are recorded and committed (public/audio/, 1081 KB). Two things
had to be fixed first, in order:

WAS BLOCKED — the key lacked voices_read:
  The supplied ELEVENLABS_API_KEY carried text_to_speech (a probe returned 200
  audio/mpeg with an ID3 header) but not voices_read, so GET /v1/voices answered
  401 and §13.2's resolution could not run. Hard-coding a voice id was rejected —
  it would desync the script from §13.2 and paper over the same failure at
  runtime, since §13.2's /api/tts resolves the voice the same way on every cold
  start. The user enabled the permission; both now work.

FINDING — §13.2's "the voice named 'Alice'" no longer matches anything:
  ElevenLabs now suffixes its premade voices with a descriptor, and the account
  lists "Alice - Clear, Engaging Educator". An exact string comparison misses it
  and §13.2's next branch picks the first British voice, which in this account
  is "George - Warm, Captivating Storyteller" — male. Penny would have silently
  stopped being the voice the spec names, in every recorded line and every
  runtime line, across the whole film. Caught because the resolution was run
  against the real voice list before recording anything.
  Referred to the user, who chose Alice. The name is now compared with the
  " - descriptor" suffix stripped, in scripts/generate-voice.mjs and api/tts.ts
  identically, so the recorded lines and the runtime lines stay one voice.
  Verified: the run logged "Alice - Clear, Engaging Educator"
  (Xb7hH8MSUJpSbSDYk0k2), not the fallback.

CONSEQUENCE — §6.3 step 5 is no longer the live path for fixed lines:
  Since P2 every line took the speechSynthesis fallback, because no MP3 existed
  and /api/tts was a stub. Now greet is served from /audio/greet.mp3 and
  speechSynthesis is not called at all for a fixed line; runtime-composed lines
  (§11.5's read-aloud, Exact/Explain) go through the real /api/tts. Real MP3
  durations change every timing in the app, so the whole regression sweep and
  the entire §15 TalkBack checklist were re-run against them — both still green.

Decisions referred to the user (the spec states two things in each case):
- Voice confirm reaches BOTH sheets and records method "voice". §11.6 says
  "confirm the open sheet if any"; §11.2 hard-codes its receipt's method as
  "double-tap". That hard-coding exists because a double-tap was the only way to
  approve — §11.2's contents list gives that sheet no Confirm button — and
  §9.1's own method union already carries "voice". Recording "double-tap" for a
  spoken approval would put a false statement in a tamper-evident log (§1's
  Action Receipts), and voice is the only route by which Tap & Tell can be
  approved without sight or touch: the §15 gap P5 entered deliberately.
- The mic is gated on speech-recognition support AND §10's "Voice input"
  setting. §10 gates it on support alone and no section assigns the toggle
  behaviour, but it is the control that names this feature; P1 had left it inert.
- §11.3 is left as written. §15's amendment records that it supersedes the
  role="status" there, so only the two sections the user named were touched.

SPEC AMENDMENTS (§15 and §16, at the user's direction):
- §15 gains the live-region queue contract — serial, one message at a time,
  minimum 900ms gap, never overwritten, data-live-busy exposed while draining —
  and the rule that the live region is the SOLE announcement channel, which is
  what supersedes §11.3's role="status" on TextCard.
- §16 step 2 now waits for data-live-busy="false" before snapshotting instead of
  relying on networkidle, and states the one-tab requirement P3 recorded. This
  is the deterministic answer P2, P3, P4 and P5 each said check.mjs needed.

FINDING — the busy flag has to include audio in flight, not just the queue:
  earcons.ts calls beginAudioActivity() at the START of an earcon and
  endAudioActivity() only inside teardown(), which runs AFTER announce(line).
  So a queue that is momentarily empty does not mean nothing more is coming. If
  data-live-busy tracked the queue alone it would read "false" ~900ms after the
  greet, while §7.1's Glance line lands at ~1043ms (P5's measurement) — P7 would
  still be racing, which is the exact bug the flag exists to kill. getLiveBusy()
  is therefore `draining || activity > 0`.

FINDING — the mic sat underneath the sheets:
  At z-20 the mic was covered by any open sheet (z-30). A tap is the only way to
  start listening (§11.6), so §11.6's own "confirm"/"cancel" intents were
  unreachable in practice and P5's accessibility gap stayed open. The mic is now
  z-40. The dialogs keep aria-modal and their focus trap; this is a push-to-talk
  button sitting over them, not a member of the dialog.

DEFECT found by verification and fixed:
  A range input's intrinsic box is ~16px tall, so §10's Journey slider was the
  one control in the app under §4's 48×48 minimum. Now h-[48px].

Derived decisions (spec-silent; recorded rather than resolved silently):
- Home's `era` prop is OPTIONAL and absent is what the router renders. §10 says
  the presets "only apply inside Journey's preview" while also naming 2026 a
  reduced preview; an optional prop is the only reading that satisfies both.
- The era presets are token overrides on the preview wrapper, not restyled
  elements: Tailwind v4 compiles .text-card to font-size: var(--text-card) and
  .bg-surface to background-color: var(--surface), so redefining the variable
  rescales or recolours the whole subtree. The multipliers stay as calc() so
  §10's "font-scale 1.2" is legible in the source.
- The preview frame uses `inert`, not aria-hidden: it drops the subtree from the
  accessibility tree AND the tab order together, so hidden focusable children
  cannot raise axe's aria-hidden-focus. 2030 is exempt — §10 calls its Glance
  button the single interactive element in the preview.
- The slider opens at position 1 (2026): both the HTML midpoint default for that
  range and §10's own default era. Its accessible name is "Year" (§15 requires
  labelled inputs; §10 names only the aria-valuetext).
- The slider's three printed year labels are aria-hidden — aria-valuetext
  already announces the year (§15 item 7), and reading all three on every swipe
  would bury it.
- DirectorPanel mounts inside the unlocked branch. §12.1 fixes the trigger's
  position but not its lifetime, and a fixed 48×48 div over the Splash would
  swallow §6.1's unlock tap.
- /director renders Home behind the open panel; §12.1 fixes the route but not
  what sits behind it.
- The panel's radio rows are full-width 48px labels, so the row is the hit
  target rather than the 20×20 input — P4 flagged the stand-in's bare radios as
  the app's only sub-48px controls, and they go with it.
- A push closes the panel: §11.2's sheet is the scenario, and the panel has done
  its job once it fires.
- The open-sheet registry is a module-level slot in ConfirmSheet.tsx beside
  useDialogSheet(), not a fifth store — only one sheet can be open at a time
  (both are modal), and §3's tree has no module for it. The precedent P4 set
  with readReceiptsAloud and P5 with useDialogSheet.
- The mic button's markup lives in App.tsx: §3's component list names no file
  for it, and P4/P5 both kept helpers inside existing §3 files rather than
  adding modules.
- It is placed after <TabBar /> so DOM order matches §10's reading order
  (Header · TabBar · floating mic).
- "play my week" by voice plays from wherever the user is; §11.6 assigns
  navigation to "receipt" and "post" only. Off Home the row flashes have nothing
  to flash, which is why §7.2's onNote is optional.
- The drained live region keeps its last message rendered. Clearing it is not
  something §15 asks for, and data-live-busy is the contract §16 keys on.
- No new unit tests. P4's node --test covers §9.2's pure logic; everything P6
  adds is DOM and side-effects, verified in the browser instead.

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness; the
speech, recogniser and WebAudio surfaces were wrapped from outside, so no debug
hooks were added to the shipped code):
- tsc --noEmit clean; npm run build ok; npm test 10/10
- §14's script with no ELEVENLABS_API_KEY warns and exits 0
- the live-region queue: §11.5's six-line read-aloud in Quiet Mode renders all
  six in order at 900/900/900/900/900ms with none lost, data-live-busy "true"
  throughout and "false" exactly 900ms after the last; the splash sequence lands
  BOTH "Hi. I'm Penny." (129ms) and "Steady. One bill this week. One unusual
  payment." (1236ms), where before the second overwrote whatever preceded it
- no element but the live region carries a live role anywhere in the DOM
- Journey: slider announces 2019/2026/2030 and opens on 2026; 2030 renders
  exactly [Steady, Glance, Sound and touch only], health word 64px, a 96×96
  button that really replays glance(), frame repainted #0A0D10; 2026 shows
  balance + both buttons + the anomaly row + the Speech-first chip at 24.2px and
  nothing else; 2019 the full UI at 26.4px on #22303C; the router's Home stays
  22px and inherits no preset
- Director: 3 taps inside 900ms open it, 3 spread over 1.5s do not; the trigger
  is absent from the accessibility tree; all twelve control labels in §12.2's
  order; focus trapped, Escape closes; Seed writes exactly §12.2's two receipts;
  Reset empties; arming persists to penny.director.v1; a push raises §11.2's
  sheet; /director opens the panel directly
- Settings: exactly §10's four controls, ending at "Prototype v1.0" — zero
  radios, zero push buttons, no "Director" legend
- §11.6: mic 56×56, bottom-right above the TabBar, after nav in DOM order,
  absent when Voice input is off, aria-pressed tracking listening both ways; all
  six intents fire correctly; "cancel my post" reaches "post" first, which is
  what first-hit-wins means; no-match speaks §11.6's line verbatim; voice "yes"
  approves Tap & Tell writing one receipt with method "voice" and §11.2's
  action/details unchanged; "no" cancels and writes none; "confirm" on §9.1's
  ConfirmSheet through the real Post Box flow writes §11.1 step 8's payload with
  method "voice"
- §6.1's invariant survives P6's new imports: no audio API touched, no
  speechSynthesis call and tone not even fetched (1 JS chunk) before the splash
  tap; tone's chunk fetched and greet + the Glance both running after it
- no regression on all five routes: #root order header · main · nav, landmarks
  banner · main · navigation · status, exactly one h1, zero serious/critical axe
  violations, every visible control ≥48×48, zero console errors
- VITE_BREAK_LAYOUT=1 renders ["Play my week","Play the Glance"]; unset renders
  the §10 order (both builds rendered, not grepped)

§15 TALKBACK CHECKLIST — 10/10, run against the accessibility tree at 390×844:
 1. swipe order matches §10 on all five routes: banner → h1 → Quiet Mode →
    screen content → navigation → the four tabs → mic
 2. the balance reads region "Current account balance" then "Current account" →
    "£1,842.60" → "Steady" → "British Gas £84 due Wednesday"
 3. the mode switch carries aria-pressed; Summary pressed on arrival, and
    selecting Explain moves it
 4. ConfirmSheet is named "Order replacement card", announces the read-back on
    open, and confirms by double-tap (method "double-tap") AND by the Confirm
    button (method "button") — one receipt each
 5. TextCards announced once: no card carries a live role, the singleton is the
    only live element, and each line rendered exactly once over a 1.5s hold
 6. the anomaly row announces "Sat, TicketPoint Ltd, Other, -£68.20, unusual
    payment"; it is the only one of the nine
 7. the slider is named "Year" and announces 2019 / 2026 / 2030 by aria-valuetext
 8. every visible control on all five routes plus the director panel and the Tap
    & Tell sheet has an accessible name; axe agrees — zero serious/critical
    across all seven surfaces
 9. receipts read as full sentences ("You have 3 receipts." / "Wednesday: Card
    payment approved, confirmed by double-tap." …) and the #hash chip is on
    screen but absent from the accessibility tree
10. the mic keeps the name "Talk to Penny" and moves aria-pressed false → true →
    false across a listening session, with the pulse ring behind
    prefers-reduced-motion

LIMIT ON THAT PASS — it is not a device pass. Items 1, 2, 4, 5 and 9 are claims
about what TalkBack UTTERS, and headless Chromium has no screen reader; what was
measured is the accessibility tree TalkBack reads from. The five must still be
confirmed on the Android handset before filming, together with P2's and P5's
outstanding device items (that speechSynthesis is audible and that
navigator.vibrate produces §8's patterns).

§13.2's /api/tts, built here because no phase would ever claim it:
  P0 built a 502 stub, P2 needed only that stub, and §14's voice script (P7)
  covers the recorded fixed lines rather than the function. P2 recorded the gap
  and P3, P4 and P5 each carried it forward unchanged. Without it every line
  composed at runtime — §11.5's read-aloud, and Exact/Explain on every letter
  (§11.1 step 6) — would stay on §6.3 step 5's speechSynthesis fallback forever,
  so Penny would never use the ElevenLabs voice at runtime at all.
  Built verbatim from §13.2, sharing generate-voice.mjs's voice resolution so
  the recorded lines and the runtime lines are the same person — including the
  case-insensitive "British" test, since ElevenLabs ships label values
  lowercased and a case-sensitive match would make that branch unreachable.
  Derived: a text over 600 chars is rejected with 400, not 502 — §13.2 says
  "reject" without naming a code, this is the caller's error rather than the
  upstream's, and §6.3 step 5 treats every non-200 identically. The cold-start
  voice lookup is cached as the promise so concurrent first requests share one
  lookup, and is NOT cached on failure, so a key whose permissions are fixed
  mid-life starts working without a redeploy.
  Verified by exercising the handler directly with fetch stubbed: non-POST,
  missing text, >600 chars and a missing key all take their specified branch;
  the request is byte-for-byte §13.2's (URL, output_format, both headers, and
  {text, model_id, voice_settings}); "Alice" wins over a British voice and over
  the first, and both fallbacks select correctly including a match in
  `description`; the body is streamed back with content-type audio/mpeg; the
  voice is resolved once per cold start, not per request; a 401 from /v1/voices,
  a 500 from text-to-speech and an empty voice list each answer 502. Run live
  against the real key it answers §13.2's 502 rather than crashing, which is the
  path §6.3 step 5 is built for.

TWO ITEMS FOR LATER PHASES (recorded, deliberately not acted on in P6):
- §14 pins includeAssets to ["audio/*.mp3", "icons/*"], which covers neither
  .wasm.js nor .traineddata.gz; P7's "installed PWA passes scenario D offline"
  needs public/tesseract/* precached (P3's finding, unchanged).
- P7's check.mjs must wait on data-live-busy="false" (§16 as amended) and reuse
  ONE tab across all five routes. The mic button will be in every baseline:
  webkitSpeechRecognition IS defined in Playwright's Chromium, so turning
  Voice input off after the baseline is written would fail lock:check.

§13.1 MOVED FROM CLAUDE TO GOOGLE GEMINI (directed by the user)

DEVIATION FROM SPEC, approved: §13.1 specified the Claude API. There is no
Anthropic credit for this project and there is Gemini credit, and a §13.1 that
cannot be called at all is worse than one naming a different vendor — without it
§10's "Point at any letter — bank or not" has nothing behind it and every live
read silently falls back to the card fixture. §13.1 and §18 are amended, with a
vendor note in §13.1 recording what changed and why.

Everything §13.1 actually constrains is unchanged: SYSTEM_PROMPT verbatim (now
sent as systemInstruction, and re-verified byte-identical to SPEC.md's own copy
at 767 chars, compared programmatically rather than by eye — P3's check re-run),
the masked JPEG from §11.1 step 2 (now inline_data), temperature 0, the seven-key
contract, the five required_action values, and "any failure → 502" so §11.1
step 4's fixture fallback still carries all four filmed scenarios.

Two changes beyond the plumbing:
- maxOutputTokens 4096, not §13.1's 1024. Gemini draws reasoning tokens from the
  same budget as the reply, so 1024 can be spent before a character of JSON is
  emitted — and exact_text is the whole letter verbatim.
- generationConfig.responseMimeType "application/json". The system prompt already
  forbids fences; this makes it structural. The fence stripper stays as defence.

FINDING — the model had to be chosen by measurement, not reputation:
  §11.1 step 3 aborts at 8s, and that budget also covers a phone uploading a
  ~1600px JPEG over mobile data, so latency binds before capability does. Against
  this project's key, on the three §5.3 prop letters, temperature 0:
    gemini-3.1-flash-lite  1.4-1.8s  card=order_card · scam=scam_alert ·
                                     pin=none + sensitive_content true, PIN
                                     masked to [hidden], the real 4821 never
                                     appearing in exact_text or summary_spoken.
                                     Three consecutive card runs: order_card each
                                     time.
    gemini-3.5-flash       5.7-6.3s  same verdicts, but under 2s inside the abort
                                     before the upload is counted, and it
                                     returned 403 on one of the three letters
    gemini-2.5-flash/-lite           404, retired for new keys
    gemini-2.5-pro                   429, quota exhausted
    gemini-3.6-flash                 403, not permitted for this key
  Pinned gemini-3.1-flash-lite. The first pin (gemini-2.5-flash, chosen from the
  docs) was dead on arrival — testing against the real key is what caught it.

Verified:
- 24 checks with fetch stubbed: the request is exactly the amended §13.1 —
  endpoint, x-goog-api-key header rather than a ?key= query param so the key
  stays out of URLs and logs, content-type, systemInstruction, inline_data,
  "Read this letter.", temperature 0, responseMimeType, maxOutputTokens; a valid
  reply parses to the letter; fenced JSON is still stripped; and a non-200,
  absent candidates, a blocked candidate, invalid JSON, a missing key, an unknown
  required_action and a network throw each answer 502; all five required_action
  values accepted
- live through `vercel dev`: POST /api/read-letter → 200 in 2567ms with the
  correct seven-key letter
- §12.3 scenario A end to end on the LIVE path at 390×844, armed "Live API":
  masking opened at +39ms and the POST left at +823ms, so masking demonstrably
  ran BEFORE anything reached the network (the privacy claim, re-proved on the
  path that actually transmits); result rendered at 3844ms, inside §11.1 step 3's
  8s abort; the card reads "Debit card expiry notification", which is the live
  model's wording and NOT the fixture's "Card expiry notice", so the live path is
  what produced it; chip "5 items hidden on device"; the order_card action button
  appeared; no read_fallback; and the bytes that left the device were 86,532
  base64 chars against the source file's 106,032 — resized and masked, not raw
- no regression on all five routes; tsc clean, build ok, 10/10 tests

NOTE for deployment: `vercel dev` does not read plain .env — it uses .env.local
and the linked project's environment. GEMINI_API_KEY had to be exported into the
shell for the live run. Before filming from the deployment URL it must be added
with `vercel env add GEMINI_API_KEY`, or §13.1 answers its specified 502 in
production and every live read falls back to the fixture.

DEPLOYMENT VERIFIED, and two blockers found on the way that only a real
deployment could have exposed:

FINDING — Vercel Authentication was on for the whole project:
  Every request, production and preview alike, 302-redirected to Vercel SSO and
  every /api call answered 401 "Protected deployment" (vercel_auth_enabled) before
  the function ran. §18 has the phone loading the app from the deployment URL, so
  an Android handset not signed into the Vercel account would have met a login
  wall instead of Penny — taking the PWA install and §12.3 D's airplane-mode test
  with it. The user disabled it.

FINDING — every route except / returned 404 on the deployment:
  /postbox, /receipts, /settings, /journey and /director all 404'd; only / and the
  static assets resolved. A Vite SPA needs a rewrite to index.html and the
  zero-config Vercel deployment had none. In-app TabBar navigation is client-side
  so it worked, which is exactly what makes this easy to miss — but any refresh,
  deep link or QR into a screen died, and §12.1's /director BACKUP ROUTE, the
  safety net for reaching the panel mid-take, was dead on the deployment.
  §16's Layout Lock would never have caught it: check.mjs runs against
  `vite preview`, which has SPA fallback built in.
  Fixed with a vercel.json carrying ONLY a rewrites array:
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  The negative lookahead keeps /api routed to the functions. This is the file §3's
  tree does not list, added because the spec's own §12.1 route and §18's
  phone-from-the-deployment-URL instruction cannot work without it. P0 avoided
  vercel.json because a legacy `builds` array would disable zero-config and break
  the dev command; `rewrites` does not, and `vercel dev` was re-checked after
  adding it — still "Running Dev Command vite --port $PORT".

Verified against the real HTTPS deployment (penny-o8avjkeib):
- all six routes 200 and serve the app shell; /audio/greet.mp3, /tesseract/
  worker.min.js and /icon.svg all 200 with correct content types
- POST /api/read-letter → 200 in 2499ms, the correct seven-key letter: the
  DEPLOYED function reached Gemini with the key stored in Vercel, which is what
  proves the env var is actually wired
- POST /api/tts → 200 audio/mpeg with an ID3 body: ElevenLabs works deployed too
- §12.3 scenario A end to end from the deployment at 390×844, armed "Live API":
  masking opened at +38ms and the POST left at +828ms — masking before the
  network, on HTTPS, the way the phone will run it — result rendered at 3343ms,
  "Debit card expiry notification" (live wording, not the fixture's), chip
  "5 items hidden on device", order_card button, no read_fallback
- the key stored in Vercel Production was pulled and compared: byte-identical to
  local .env, and a direct call with it returns 200

STILL OUTSTANDING FOR THE HUMAN, before filming:
- PRODUCTION IS STALE. The only production deployment is 3 days old and predates
  the Gemini switch, the fifteen MP3s, the SPA rewrite and all of P4–P6. Run
  `vercel --prod` to publish current code; everything verified above was on a
  preview deployment.
- The device pass. §15 items 1, 2, 4, 5 and 9 are claims about what TalkBack
  UTTERS and can only be settled on the Android handset, together with P2's and
  P5's outstanding items (that speechSynthesis is audible — now only relevant
  for runtime-composed lines — and that navigator.vibrate produces §8's three
  patterns).

P7 — complete

PWA, scripts and Layout Lock per SPEC §17 P7: scripts/make-icons.mjs (§14) with
public/icons/penny-{192,512}.png committed, the vite-plugin-pwa block in
vite.config.ts (§14), ci/layout-lock/check.mjs (§16) and the five committed
baselines. §14's other script, generate-voice.mjs, and §13.2's /api/tts both
landed in P6 ahead of §17's ordering, so P7 re-verifies them rather than building
them: the voice script still warns and exits 0 with no key.

SPEC AMENDMENT (§14, directed by the user and the only spec change in P7):
  includeAssets gains "tesseract/**" and workbox gains
  maximumFileSizeToCacheInBytes: 15 * 1024 * 1024. This is the item P3 recorded
  and P4, P5 and P6 each carried forward unchanged. Without it §17 P7's own
  acceptance criterion cannot be met and §12.3 D's claim has nothing behind it.
  §14 carries a precache note recording what changed and why.

FINDING — the two settings fail in OPPOSITE ways, which is why both are needed:
  Read out of the installed plugin rather than assumed. vite-plugin-pwa resolves
  includeAssets against publicDir and pushes each match into workbox's
  additionalManifestEntries (index.js:97-126), and workbox applies
  additionalManifestEntriesTransform LAST, after maximumSizeTransform
  (lib/transform-manifest.js) — so includeAssets entries bypass the size filter
  entirely. Therefore:
  - eng.traineddata.gz (2.9 MB) matches NONE of Workbox's default globs
    (js/css/html/ico/png/svg), so without "tesseract/**" it is SILENTLY absent.
    No warning, no error: the app installs, looks right, and answers a
    cold-start photograph with "Masking unavailable".
  - the two tesseract-core-*.wasm.js (3.94 MB each) DO match "**/*.js", so at
    the 2 MiB default they fail the build outright — vite-plugin-pwa resolves
    throwMaximumFileSizeToCacheInBytes to !showMaximumFileSizeToCacheInBytesWarning,
    i.e. true (index.js:910). Loud, not silent.
  One setting fixes each. Neither substitutes for the other.

FINDING — three files are precached TWICE, and it is safe only by coincidence:
  With the limit raised, the three .js files under public/tesseract/ are matched
  by BOTH the default glob and includeAssets, and nothing deduplicates them:
  additionalManifestEntriesTransform pushes unconditionally. workbox-precaching
  throws add-to-cache-list-conflicting-entries at install when one URL carries
  two revisions — which would kill the service worker and take scenario D with
  it. It does not fire here because both code paths hash MD5 over file content
  (workbox-build/lib/get-string-hash.js and vite-plugin-pwa/dist/index.js:47),
  emit the same relative URL, and no modifyURLPrefix is configured, so the
  revisions are identical and the second entry is dropped. Asserted after every
  build, not assumed: the manifest is parsed out of dist/sw.js and checked for
  any URL appearing with two different revisions. If that ever diverges the fix
  is globIgnores on the tesseract directory.
  Manifest: 30 entries, 27 unique URLs, 12.07 MB.

Decision referred to the user (§16 contradicts itself once P3's one-tab rule is
applied):
- §16 step 2 says "click body once (dismisses Splash)" for EVERY route, and also
  that all five routes reuse one tab. With one tab the Splash exists only on "/".
  On the other four the same click lands on the centre of <body> — Settings'
  Quiet Mode toggle or its /journey link, Post Box's <label> wrapping the file
  input, Home's two pill buttons — and would rewrite the very tree being
  baselined. Agreed: issue §16's literal body click, guarded on the Splash
  button being present. §16's own parenthetical fixes the click's purpose, and
  where there is no Splash there is nothing to dismiss. P1 had already reshaped
  the Splash out of `fixed` so that a body click lands on it; that fix is still
  what makes the guarded click work.

Derived decisions (spec-silent; recorded rather than resolved silently):
- The --baseline refusal exits 1. §16 fixes the string and not the code; a
  refusal is a failure. It is also checked BEFORE the build, so the one line
  explaining the refusal is not buried under ten seconds of vite output.
- Everything check.mjs prints goes to stdout, failures included. stdout is
  block-buffered when piped and stderr is not, so splitting them would let a
  BUILD FAILED line overtake the diff that explains it — and §16 says this
  output is read off a terminal in front of an audience.
- Axe runs in --baseline mode too (§16 step 3 is not scoped to check mode) and
  prints violations as warnings without changing the exit code, which §16 step 4
  fixes at 0. A migration that silently enshrined a serious violation would
  defeat the gate.
- A missing baseline prints its own line rather than a regression message: it is
  not a structure change, it is an absent contract, and a diff against "" says
  nothing useful.
- The unified diff is hand-rolled (LCS backtrack, 3 lines of context). §19 bans
  added dependencies and snapshots are ~40 lines, so the O(n·m) table is free.
- check.mjs spawns `node node_modules/vite/bin/vite.js` rather than going through
  npm: the preview server has to be killable, and an npm wrapper leaves the real
  server orphaned on port 4173.

FINDING — the busy flag has to be waited for in BOTH directions:
  §16 as amended says wait for data-live-busy="false". On its own that is not
  enough on the splash route: the flag is ALREADY "false" at the moment of the
  tap, and §6.1 spends the tone dynamic-import, Tone.start() and the silent
  buffer before speak() raises it. A "false"-only wait is therefore satisfied
  instantly and snapshots an empty region. This is not theoretical — it happened
  while building the /journey harness for the note below, and the symptom was
  that the walk navigated away before setUnlocked reached sessionStorage, so
  /journey rendered the Splash. check.mjs waits for "true" first on the splash
  route (§6.3 step 1 announces BEFORE it plays, so the flag rises the instant
  greet starts), then for "false". Three consecutive lock:check runs are green.

FINDING — Playwright's ariaSnapshot does not model `inert`:
  The /journey baseline contains the whole preview subtree — balance region,
  both buttons, the anomaly row — even though P6 chose `inert` on the frame
  specifically to drop it from the accessibility tree. Checked against Chrome's
  OWN tree via CDP Accessibility.getFullAXTree rather than argued: Chrome's tree
  for /journey contains RootWebArea, the h1, Quiet Mode, the slider, the four
  tabs and the mic, and NO node named "Play the Glance", "Play my week" or
  "Current account balance". Both preview buttons are also out of the tab order.
  So P6's decision is correct and TalkBack does not read the preview; it is
  Playwright's own computed tree that ignores `inert`.
  Consequence, recorded for whoever migrates next: the Journey baseline is
  BROADER than what a screen reader hears. That makes the lock stricter, not
  wrong — changing the preview's structure trips the gate — but the file must
  not be read as "what TalkBack utters".

FINDING — Playwright cannot emulate airplane mode completely:
  context.setOffline(true) blocks the network but leaves navigator.onLine TRUE,
  in every configuration tried (newContext({offline}), persistent + setOffline
  on the pre-existing page, on a fresh page, and launched with {offline:true} —
  all four measured). P3 gates read_fallback on navigator.onLine, so the app
  correctly stayed silent and the first offline run "failed" on the harness's
  account, not the app's. A handset in airplane mode reports both. The flag is
  stubbed to false from OUTSIDE via addInitScript, exactly as the speech, fetch
  and WebAudio surfaces have been wrapped since P2 — no debug hooks in shipped
  code — and the run additionally proves the network really is dead by watching
  an uncached request get rejected.

OBSERVATION — Post Box's photograph control appears twice in its baseline:
  postbox.snap.yml carries both `text: Photograph a letter` and
  `button "Photograph a letter"`. That is §10's own markup — a styled <label>
  wrapping a sr-only file input — where the label contributes a text node and
  the input contributes the named button. Axe is clean and P6's TalkBack pass
  covered it; P7 changes nothing, because §10 IS the DOM contract and P7's job
  is to enshrine it, not edit it. Recorded so the duplicate is not mistaken for
  a Layout Lock artefact.

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness):
- tsc --noEmit clean; npm run build ok (1058 modules); npm test 10/10
- icons: 192×192 and 512×512 PNG; sampled pixel-for-pixel against §4's tokens —
  background #101418, circle #FFB703, the "P" glyph exactly #101418 over 9810
  pixels (so it rendered; a missing font would have left the circle bare), and
  the rx=96 corners transparent
- §14's voice script with no ELEVENLABS_API_KEY warns and exits 0 (P6's, re-run)
- precache manifest parsed out of dist/sw.js: all four tesseract/* entries, all
  fifteen audio/*.mp3, both icons, manifest.webmanifest and index.html present;
  27 unique URLs; zero URLs carrying conflicting revisions
- all four §16 strings compared PROGRAMMATICALLY against SPEC.md's own copies,
  not retyped — including U+2014 in three of them and U+2713 in "Layout Lock ✓"
- lock:baseline without LOCK_MIGRATION=1 prints §16's refusal verbatim, exits 1,
  and leaves all five baseline files byte-identical (md5 before and after)
- LOCK_MIGRATION=1 lock:baseline writes home 38 / postbox 23 / receipts 23 /
  settings 32 / journey 31 lines, zero axe warnings, exit 0, ~30s end to end
- every baseline read through against §10: header SoundDot(absent, aria-hidden) ·
  h1 · Quiet Mode; Home's balance region then both buttons then the nine rows
  with the anomaly suffix; Receipts in its EMPTY state (P4's note, confirmed);
  Settings exactly §10's four controls ending at "Prototype v1.0" — no trace of
  P3's temporary director stand-in; Journey's slider resting on 2026; the mic in
  all five (P6's warning honoured — webkitSpeechRecognition IS defined in
  Playwright's Chromium, so turning Voice input off would now fail lock:check);
  and the live region carrying "Steady. One bill this week. One unusual payment."
  on / and empty on the other four
- lock:check green THREE consecutive times: "Layout Lock ✓ 5 routes verified,
  0 violations", exit 0. One green run would have proved nothing about a race
  four phases asked this gate to close
- lock:demo-break exits 1 with a unified diff showing ["Play my week", "Play the
  Glance"] against the baseline's ["Play the Glance", "Play my week"], then
  §16's line for route / verbatim. It ALSO fails /journey, which is a true
  positive rather than noise: Journey renders <Home era="2026"/>, so the
  VITE_BREAK_LAYOUT swap really does regress two routes
- the axe branch was PRODUCED, not asserted: an unlabelled button was added to
  Settings, lock:check printed "BUILD FAILED — critical accessibility violation
  on /settings: button-name (Buttons must have discernible text)" alongside the
  regression line, both were byte-compared against §16's templates filled in
  from SPEC.md, the button was reverted, and lock:check went green again
- SCENARIO D OFFLINE FROM A COLD START (P7's acceptance criterion), Playwright
  persistent profile so the service worker and its caches survive a restart:
  warm run visits ONLY "/" and arms PIN through §12.1's /director, so tesseract
  writes nothing to IndexedDB (asserted: zero databases) and the offline run is
  a true first OCR served by the service worker rather than a warm cache. The
  context is then CLOSED — that is the cold start — and reopened offline.
  Results: the Splash loads from precache; a DEEP LINK straight to /postbox
  resolves through Workbox's navigateFallback (so a refresh or QR into a screen
  survives offline, which the deployment's own 404 bug in P6 shows is not free);
  the chip reads "2 items hidden on device", NOT "Masking unavailable"; the live
  region carries read_fallback at 820ms then pin_privacy at 6994ms, in that
  order, with no second summary after it; both lines played from the precached
  MP3s rather than speechSynthesis; the printed PIN (4821) never appears in the
  live region; zero /api calls; and /tesseract/worker.min.js,
  /tesseract/tesseract-core-simd-lstm.wasm.js and /tesseract/eng.traineddata.gz
  were ALL served by the service worker at 200 — which is the one thing that had
  to be measured rather than assumed, since tesseract spawns its worker from a
  blob: URL and a blob worker only reaches the SW by inheriting its owner's
  controller
- the prop photographed offline is §5.3's pin exact_text with the printed 4821
  substituted for [hidden], rendered at 1240×1754 — read out of letters.ts
  rather than retyped

MEASUREMENT WORTH WATCHING — masking took 5.0s and 7.0s across two offline runs
of the same image, against §11.1 step 2's 10s timeout. There is less headroom
than that number suggests, and this is a dev machine also running the preview
server. If a phone crosses 10s during filming, scenario D degrades to the
specified "Masking unavailable" chip — correct behaviour, but it removes the
beat the shot exists for. Time it on the handset before filming beat 2.

THREE ITEMS FOR THE HUMAN (P7 closes the build; these are not code):
- PRODUCTION IS STILL STALE. Unchanged from P6, and now larger: production also
  predates the PWA itself, so nothing installable exists at the production URL
  yet. Run `vercel --prod`, then install from the phone and re-run scenario D on
  the handset — the automated run above is the honest proxy for an installed
  PWA, not the thing itself.
- The device pass, unchanged from P6: §15 items 1, 2, 4, 5 and 9 are claims
  about what TalkBack UTTERS, plus P2's and P5's items (speechSynthesis audible
  for runtime-composed lines, navigator.vibrate producing §8's three patterns).
- Time the masking on the handset, per the measurement above.

P8 — complete

Voice control surface per SPEC §17 P8: §11.7 in full. lib/intents.ts rewritten as
pure phrase data plus a pure matcher; lib/voiceInput.ts gains the dispatch table;
the order-card flow moved to components/ConfirmSheet.tsx as an app-level host;
verifyChainAloud() extracted from screens/Receipts.tsx; mode and era registries in
PostBox and Journey; the Always listening setting; Post Box's full-bleed idle
label; audio.ts's lastSpoken and stopSpeaking(); earcons.ts's stopEarcons(); and a
deliberately migrated Layout Lock baseline.

30 intents, 350 phrases, 8-12 per intent. Zero new runtime dependencies, zero new
screens or routes, and NOT ONE of the fifteen committed MP3s regenerated — every
new line is runtime TTS through /api/tts with §6.3 step 5 behind it. The existing
flows keep their fixed-line ids (readback_card, cancel_ok, quiet_on, chain_ok,
done_receipt).

SPEC AMENDMENT (§11.7 new, §17 P8, §10's Settings list), directed by the user and
committed separately as `spec: §11.7 voice control surface`. §19 bans additional
settings; §11.7 creates exactly one exception, the Always listening toggle, and
records why in the section itself. Nothing else in §19 is relaxed.

Decisions referred to the user (in each case the spec states two things):
- Two §10 controls had no phrasing. §11.7's table gives none to "Always
  listening" — the toggle it itself adds — or to "Demo mode", while §17 P8's
  acceptance criterion is that EVERY §10 control is reachable by voice. Agreed:
  add four intents (always_listening_on/off, demo_mode_on/off), taking the count
  from 26 to 30. Without them the criterion could only have been reported failed.
- verify_chain's broken path. §11.7 says the broken index is SPOKEN. §10 gives a
  spoken line to the intact case only, and P4 deliberately routed the broken case
  to aria-live alone. P8's own constraint is that a voice intent calls the same
  function the button calls, so one of the two had to move. Agreed: both paths now
  speak "Broken at entry {n}." through runtime TTS. P4's reasoning is superseded,
  not lost — speak() mirrors to the live region anyway, so the screen-reader
  announcement P4 was protecting still happens, and in Quiet Mode the line becomes
  a TextCard like every other.

FINDING — the matcher could not be unit-tested where the intents lived:
  §11.7 wants INTENTS to be pure data and matchIntent() to be a pure function, and
  P8's test criterion is that every phrase resolves to its own intent — an
  assertion only worth writing if it iterates INTENTS itself, since the claim
  "no §10 control is voice-unreachable" is a claim about this table. But P6's
  intents.ts imported ConfirmSheet.tsx and Receipts.tsx, and `node --test` cannot
  load JSX.
  Passing those two actions in through a context object did not fix it either.
  intents.ts still reached lib/audio.ts -> data/voiceLines.ts, which imports JSON
  with no import attribute — Node's ESM requires `with { type: "json" }` — and
  P4's own finding that Node does no extension search would have forced .ts
  suffixes across five more modules, for a test.
  So the split is by MODULE, not by callback. intents.ts is the LANGUAGE and
  imports NOTHING; voiceInput.ts is the ear and the hands and imports everything,
  .tsx included. §3 already pairs the two files as §11.6's implementation, and
  voiceInput.ts is not unit-tested, so it may import freely. The consequence worth
  keeping: intents.test.ts needs no window stub at all, unlike
  state/receipts.test.ts, which must stand in for window.localStorage before
  zustand's persist resolves it.

DERIVED — the array order inverts §11.7's own table, twice, and had to:
  §11.7 fixes the priority tiers (sheet > screen > global) and "first match wins",
  but the position of entries WITHIN a tier is the mechanism, and the table's own
  order leaves two intents dead:
  - "turn quiet mode off" contains "quiet mode", so quiet_off must precede
    quiet_on. The table lists quiet_on first.
  - "what did I spend on Tuesday" contains "what did I spend", so day_query must
    precede play_week. The table lists play_week first.
  Three more orderings are load-bearing and happen to match the table:
  always_listening_* before listening_off and _off before _on ("always listening
  off" contains "always listening"); listening_off before stop_speaking ("stop
  listening" contains "stop"); and stop_speaking last among the globals, since its
  phrases are the shortest in the file. Navigation sits last of all, so
  "read my receipts" reads them and "receipts" goes there.
  All five are recorded in the source beside the entries they constrain, because
  a phrase added later in the wrong place silently kills an intent.

Derived decisions (spec-silent; recorded rather than resolved silently):
- `{day}` is a template token inside day_query's phrases, not a bare prefix plus a
  separate weekday scan. A phrase therefore cannot fire without a day named, and
  the test can substitute one and keep iterating INTENTS generically.
- lastSpoken stores the whole SpeakInput, not the bare string §11.7 names, so
  `repeat` replays a fixed line from its committed MP3 rather than re-synthesising
  it in a different voice. It is set before §6.3 step 2's Quiet Mode branch, so
  "say that again" works on a text card too.
- stopSpeaking() is a generation counter, not a cleared array. §6.3's queue IS a
  promise chain, so the way to empty it is to make every line already sitting in
  it a no-op; resetting the chain to a fresh resolved promise would let a new line
  start while the aborted one was still settling.
- play()'s aborter RESOLVES rather than rejects. run()'s catch is §6.3 step 5's
  speechSynthesis fallback, so a rejecting stop would have immediately spoken the
  line it had just been told to stop.
- The aria-live queue is deliberately NOT cleared. §15 makes it serial and never
  overwritten, and §11.7 scopes the clear to "the speech queue in audio.ts":
  silencing the speakers must not silence a screen reader.
- stopEarcons() is exported from earcons.ts and called by the handler rather than
  from inside audio.ts, so no import cycle forms with the module earcons.ts
  already imports.
- The order-card flow moved out of screens/PostBox.tsx. §11.7 makes `order_card`
  GLOBAL while §10 keeps the button on Post Box, so the alternative was two copies
  of an account consequence — the one thing §1's Read-Back Rule cannot afford to
  have drift. requestOrderCard() and <OrderCardSheet/> live in
  components/ConfirmSheet.tsx for the reason P5 put useDialogSheet() there and P6
  the sheet registry: §3's tree names no module for it and this one owns the sheet.
  The host renders nothing until asked, so no baseline sees it.
- Post Box's idle label, three consequences of §11.7's "the entire main region
  becomes the <label>": the 56px pill is a <span>, because a real <button> nested
  in a label is invalid and would swallow the label's own click; the hint is a
  <span class="block">, because a label's content model is phrasing content and a
  <p> inside one is invalid HTML; and the input carries an explicit aria-label, or
  its accessible name would absorb the hint and stop being §10's name. Masking and
  result states keep the plain 56px pill. Element order is unchanged throughout —
  only nesting moves.
- Registries rather than a fifth store for the reading mode and the era, following
  P6's registerSheet(). PostBox registers pick(), not setMode(), so voice takes
  the identical switch-and-replay path the segmented control takes; it registers
  only while a letter is on screen, so "explain" with nothing to read falls
  through to the contextual offer rather than switching an invisible control.
- Navigation announces the bare screen name ("Home.", "Receipts.", "Settings.",
  "Sight-loss journey."). go_postbox speaks §11.7's pinned camera line instead.
- day_query marks credits in words — "ASOS refund, plus £12.00" — rather than with
  a sign: "-£42.30" read aloud is not a sentence. §10's rows draw the same
  distinction visually.
- billPhrases() moved to data/account.ts so Home's bills line and the `bills`
  intent cannot disagree — the precedent P1 set by putting accountHealth() there
  for P2's glance().
- `help` and the unmatched offer share one composer. §11.7 gives help "the
  contextual list for the current screen" and unmatched input "a warm contextual
  offer naming what is available on the current screen" — the same list, so one
  implementation and no drift. `repeat` with nothing spoken yet, and mode_*/era_*
  with no screen registered, fall through to it rather than going silent.
- Always listening: the restart lives inside listen(), and App.tsx's effect
  deliberately does NOT depend on `listening` — with it, listen()'s own give-up
  guard would be undone the instant it fired. That guard (three consecutive
  sessions that end without a result) turns the SETTING off and says so, because
  §11.7 is silent on a denied microphone and a restart loop would otherwise spin
  it for the rest of the session.
- The route is read from a ref at result time, not closed over: a recogniser
  result arrives long after the callback that reads it was created, and §11.7
  scopes intents by "the current route".
- isSheetOpen() is read inside runIntent() for the same reason — a sheet can open
  or close between the tap and the transcript, and §11.7's priority rule is about
  the moment the customer spoke.
- No new unit tests beyond the matcher, as instructed. Everything else P8 adds is
  DOM and side effects, verified in the browser as every phase since P2 has done.

OBSERVATION — Post Box's two text nodes merged in the baseline:
  postbox.snap.yml carried `text: Photograph a letter` and `paragraph: Point at any
  letter — bank or not.` as separate nodes. With the hint inside the label they are
  one text run, `text: Photograph a letter Point at any letter — bank or not.`,
  while `button "Photograph a letter"` is unchanged — which is exactly what the
  input's new aria-label protects. This is Playwright merging adjacent text within
  a container, not content going missing: both sentences are still in the tree, in
  order. Recorded so the merge is not mistaken for a regression, in the same spirit
  as P7's note that this control appears twice.

LAYOUT LOCK MIGRATION (deliberate, and the reason §17 P8 names one):
  Two legitimate accessibility-tree changes — §10's fourth Settings toggle and
  §11.7's full-bleed Post Box label. lock:check was run BEFORE migrating and failed
  correctly, on exactly those two routes and no others. lock:baseline without
  LOCK_MIGRATION=1 printed §16's refusal verbatim and exited 1. With the flag, all
  five baselines were rewritten; `git diff ci/layout-lock/baseline/` shows only
  postbox.snap.yml and settings.snap.yml changed — home, receipts and journey are
  byte-identical, which is the evidence the migration is scoped to the two intended
  changes and did not quietly enshrine a third.

Verified (390×844 Chromium against `vite preview`, i.e. §16's own harness; the
recogniser, speech, the shared audio element, AudioContext and vibrate were all
wrapped from OUTSIDE via addInitScript, so no debug hooks were added to shipped
code):
- tsc --noEmit clean; npm run build ok (1058 modules); npm test 14/14 — P4's ten
  plus P8's four
- the matcher: all 350 phrases across 30 intents resolve to their OWN intent, the
  assertion iterating INTENTS itself so a shadowed phrase fails rather than hides;
  "stop" is `cancel` with a sheet open and `stop_speaking` without; sheet, mode and
  era phrases are not merely outranked off their scope but ineligible; day_query
  extracts all seven weekdays and "what did I spend" without one is play_week;
  nonsense returns null in every scope and no offer contains "try saying"
- 33/33 on the intents themselves: five navigations land on their route and
  announce arrival; glance and playWeek run ("Played seven days. One unusual
  payment on Saturday."); bills speaks "British Gas £84 due Wednesday."; all seven
  day_query lines are exact, including "Monday: Tesco, £42.30. ASOS refund, plus
  £12.00." and "Sunday: From savings, plus £150.00."; read_receipts composes §11.5
  WITHOUT navigating; verify_chain plays chain_ok.mp3; all four new toggles flip
  the persisted setting and announce it; repeat replays the previous line; help and
  unmatched both speak §11.7's Home offer verbatim; era phrases move the slider's
  aria-valuetext and are inert on Home; listening_off removes the mic
- 18/18 on Post Box and the order card: the idle label computes min-height 506.4px,
  exactly 60vh at 844 (it RENDERS at 506.390625 — a sub-pixel boundary, so the
  applied constraint is what is asserted); the input keeps the accessible name
  "Photograph a letter"; the hint is inside the label; a photographed card letter
  still masks BEFORE anything else ("5 items hidden on device") and then plays
  summary_card and offer_card; "explain it to me" / "word for word" / "give me the
  summary" each move aria-pressed AND replay that mode's text, Summary returning to
  the recorded summary_card.mp3; the BUTTON still writes §11.1 step 8's payload
  with method "button" and a genesis prevHash then done_receipt, so the flow
  survived leaving PostBox.tsx; "I need a new card" from HOME raises the same
  dialog, readback_card.mp3 plays and the live region spells "42 Lavender Grove";
  "stop" with that sheet open CANCELS (cancel_ok, no receipt) rather than stopping
  speech, which is §11.7's priority rule proved on the app rather than the matcher;
  and "order my card" then "yes" writes the identical payload with method "voice"
- 19/19 on barge-in and Quiet Mode: over a recorded MP3 (chain_ok) the audio
  element is paused 0ms after the transcript and the sound-dot stops pulsing; over
  the speechSynthesis path cancel() lands 0ms after; three lines queued behind the
  stop are dropped, not merely the current one; data-live-busy returns to false, so
  §6.3 step 6's refcount is clean and §16's gate cannot hang on it; speak() still
  works afterwards, which a generation counter that never advanced would have
  wedged permanently; a running playWeek is torn down and its completion line never
  arrives. In Quiet Mode every voice response — a data line and a navigation
  announcement — speaks nothing, renders a TextCard and still reaches the live
  region, while the Glance still sounds
- 31/31 on the no-regression sweep: §6.1's invariant holds (0 AudioContexts, 0
  speechSynthesis calls and 0 audio plays before the splash tap; exactly 1
  AudioContext after) even though voiceInput.ts now imports half the app; on all
  five routes #root is header·main·nav, exactly one h1, the live region is the only
  live element, every visible control is ≥48×48 and axe reports zero
  serious/critical; Settings lists exactly Quiet Mode · Voice input · Always
  listening · Demo mode with Always listening pressed=false and Voice input
  pressed=true, and still ends at "Prototype v1.0". Zero console errors in every
  run — the only network failures anywhere are /api/tts 404s, §6.3 step 5's
  expected fallback under `vite preview`
- tone is still absent from the 239.91 KB entry chunk and present in the 340.53 KB
  lazy chunk; the string "try saying" appears nowhere in the build
- §10 coverage generated FROM the INTENTS array rather than by hand: 31 controls,
  all 31 reachable, each printed beside the real first phrase the matcher accepts
- lock:check green THREE consecutive times after the migration ("Layout Lock ✓ 5
  routes verified, 0 violations", exit 0); lock:demo-break exits 1 with §16's line
  for route / verbatim, and also for /journey — the true positive P7 recorded,
  since Journey renders <Home era="2026"/>

HARNESS NOTE, for whoever re-runs this: the speech stand-in must take a REALISTIC
time. Headless Chromium ships no voices, so a wrapped speechSynthesis has to fire
'end' itself or §6.3's queue wedges — but firing it after 5ms leaves nothing to
barge in on, and the first stop_speaking run "passed" against a line that had
already finished. It now runs at roughly a speaking rate and honours cancel().

NOT VOICE-REACHABLE, deliberately, and each for a reason with no workaround:
- The Splash's "Open Penny". §6.1 blocks every audio API until it is tapped, so
  voice does not exist yet while that control is the whole screen. Same browser
  rule as §11.7's camera constraint.
- Turning Voice input back ON after `listening_off`. §10 gates the mic on that
  setting, so the control is off screen; the spoken line names Settings as the way
  back, which is why it says so.
- §12's director panel — not a §10 control, and deliberately hidden from customers.

FOUR ITEMS FOR THE HUMAN (P8 adds the first; the rest are P7's, unchanged):
- The voice device pass. Every phrase above was matched against a transcript the
  harness supplied. What Chrome for Android's recogniser actually RETURNS for these
  utterances — British accent, room noise, "twenty twenty six" versus "2026" — is
  the one thing that cannot be measured here, and the phrase table is where it
  would show. Say each intent aloud on the handset before filming. Turning "Always
  listening" on for that pass is worth it; leave it off for the takes.
- PRODUCTION IS STILL STALE. Unchanged from P7: production predates the PWA, the
  Gemini switch, the fifteen MP3s and the SPA rewrite. Run `vercel --prod`, then
  install from the phone and re-run scenario D on the handset.
- The device pass for §15 items 1, 2, 4, 5 and 9 — claims about what TalkBack
  UTTERS — plus P2's and P5's items (speechSynthesis audible for runtime-composed
  lines, which P8 adds a great many of, and navigator.vibrate producing §8's three
  patterns).
- Time the masking on the handset, per P7's measurement (5.0s and 7.0s against
  §11.1 step 2's 10s timeout).

P8 addendum — the mic's listening animation (user-directed)

SPEC 11.6 pins the mic's active state as an "amber pulse ring". P8 made this
button the primary control rather than one way in, and the user asked for the
listening state to read like Siri. Reshaped, not replaced: it is still an amber
ring, still SPEC 4's single accent, and the 56px tap target still never moves.

Three layers, all in styles.css, all amber:
- .mic-listening — an ambient glow bed drawn with box-shadow, breathing 2px to
  14px over 1600ms. box-shadow rather than a scale, so the target holds still
  under the finger.
- .mic-halo — a conic-gradient comet orbiting the rim once every 2.4s, masked to
  a ~4px stroke standing 3px clear of the disc. Its opacity breathes on a
  different period (1600ms) from its rotation, so the two never resolve into a
  countable beat.
- .mic-bar — the 10px glyph becomes four bars on periods 520/700/610/580ms with
  negative delays, so they start already out of phase. #101418 on amber, per
  SPEC 4. The shape is the product's own: SPEC 7.2 draws a week as pitch and
  pan, this draws a voice as level.

DEFECT found by verification and fixed:
  The halo is absolutely positioned, so the button was given `relative` — which
  cost it its fixed position outright. Tailwind emits .relative after .fixed, so
  the later rule won and the mic fell out of the viewport corner into document
  flow (measured at x=-18, y=946 on a 390x844 page). A fixed element is already
  a containing block; the class was never needed. Removed.

DESIGN NOTE — the first pass was a muddy bevel:
  The glow bed started at 6px/0.28 and the comet's mask put its inner edge
  exactly on the disc. With no gap the three layers merged into one thick brown
  border — amber at 0.28 over #101418 is brown — and it read as a heavy edge
  rather than as light. Fixed by dimming the bed to 0.10/0.16, thinning the
  comet to a ~4px stroke, and opening a 3px dark gap between disc and comet. The
  gap is what does the work.

Reduced motion is not a degradation to nothing. The static ring, the frozen
comet arc and the resting bars all sit OUTSIDE the prefers-reduced-motion block
on purpose: before this, a customer with motion reduced saw no visual difference
between listening and idle at all, and aria-pressed was the only signal — fine
for a screen reader, nothing for a low-vision customer. Verified in both modes.

Verified (390×844 Chromium, deviceScaleFactor 3, against `vite preview`):
- tap target 56×56 idle AND listening, unchanged; the halo is pointer-events:
  none, and a hit test 36px from centre — inside the halo, outside the disc —
  lands on <main>, not the button, so the animation steals no taps
- every element inside the button is within an aria-hidden subtree; the
  accessible name stays "Talk to Penny" and aria-pressed still tracks listening
- with prefers-reduced-motion: reduce, all three animation-names compute to
  "none" while the static ring, arc and bars remain
- npm run lock:check green — the baseline is untouched, because the listening
  treatment renders only while listening and never reaches the accessibility
  tree; SPEC 16 still reads `button "Talk to Penny"`
- tsc --noEmit clean; npm test 14/14; and all four P8 harnesses re-run against
  the animated button: 33/33 intents, 18/18 Post Box and order card, 19/19
  barge-in and Quiet Mode, 31/31 no-regression, zero console errors
