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
