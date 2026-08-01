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

P6 — complete except the MP3s (blocked on an API key permission, see below)

Journey, Director and voice input per SPEC §17 P6: components/DirectorPanel.tsx
(§12.1 + §12.2), screens/Journey.tsx with Home's era prop and three preset class
sets in styles.css (§10), lib/voiceInput.ts + lib/intents.ts (§11.6), and the
deletion of all seven temporary Settings controls. Also, at the user's
direction and ahead of §17's own ordering: scripts/generate-voice.mjs (§14) and
the two P5 findings, which amend §15 and §16.

BLOCKED — the fifteen MP3s are not recorded:
  scripts/generate-voice.mjs is written and works; public/audio/ is still empty.
  The supplied ELEVENLABS_API_KEY is valid and carries text_to_speech (a probe
  returned 200 audio/mpeg with an ID3 header) but NOT voices_read: GET
  /v1/voices answers 401 "missing the permission voices_read". §13.2's voice
  resolution is a GET /v1/voices, so "Alice" cannot be resolved and no line can
  be recorded in the specified voice. Hard-coding a voice id was rejected — it
  would desync the script from §13.2 and paper over the same failure at runtime,
  since §13.2's /api/tts resolves the voice the same way on every cold start.
  FIX: enable voices_read on the key, then `ELEVENLABS_API_KEY=… npm run voice`.
  Until then every line takes §6.3 step 5's speechSynthesis fallback, which is
  what P2–P5 verified against, so nothing else in the app is blocked.

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

FOUR ITEMS FOR LATER PHASES (recorded, deliberately not acted on in P6):
- The fifteen MP3s. Enable voices_read on the ElevenLabs key and run
  `npm run voice`; the script and the commit are ready for them.
- §13.2's real /api/tts is STILL unassigned to any phase in §17 (P2's finding,
  unchanged through P3, P4 and P5). It needs the same voices_read permission.
  Without it Penny never uses the ElevenLabs voice at runtime.
- §14 pins includeAssets to ["audio/*.mp3", "icons/*"], which covers neither
  .wasm.js nor .traineddata.gz; P7's "installed PWA passes scenario D offline"
  needs public/tesseract/* precached (P3's finding, unchanged).
- P7's check.mjs must wait on data-live-busy="false" (§16 as amended) and reuse
  ONE tab across all five routes. The mic button will be in every baseline:
  webkitSpeechRecognition IS defined in Playwright's Chromium, so turning
  Voice input off after the baseline is written would fail lock:check.
