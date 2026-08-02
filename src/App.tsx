import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { OrderCardSheet } from "./components/ConfirmSheet";
import DirectorPanel from "./components/DirectorPanel";
import Header from "./components/Header";
import LiveRegion from "./components/LiveRegion";
import Splash from "./components/Splash";
import TabBar from "./components/TabBar";
import TapTellSheet from "./components/TapTellSheet";
import TextCards from "./components/TextCard";
import Home from "./screens/Home";
import PostBox from "./screens/PostBox";
import Receipts from "./screens/Receipts";
import Settings from "./screens/Settings";
import Journey from "./screens/Journey";
import { listen, runIntent, speechRecognitionSupported } from "./lib/voiceInput";
import { useDirector } from "./state/director";
import { useSession } from "./state/session";
import { useSettings } from "./state/settings";

// SPEC 10 / 15: exactly one h1 per screen, and it is the shared Header's title.
// SPEC 10 states Journey's literally; the other four take their SPEC 10 screen
// names, which are also the TabBar labels.
const TITLES: Record<string, string> = {
  "/": "Home",
  "/postbox": "Post Box",
  "/receipts": "Receipts",
  "/settings": "Settings",
  "/journey": "One customer. Three years.",
};

// SPEC 3: router, Splash gate, LiveRegion, DirectorPanel mount. Journey is
// routed but is not a tab (SPEC 10); /director is SPEC 12.1's backup route and
// is excluded from both the TabBar and SPEC 16's route list.
//
// Body order is SPEC 10's canonical order: header · main · nav. SPEC 11.2's
// payment sheet and SPEC 11.3's text cards are mounted after the TabBar because
// both overlay the whole app rather than belonging to a screen — and both
// render nothing at all unless a push is pending or speech has been suppressed,
// so SPEC 16's route walk never sees them. The director's trigger is
// aria-hidden and its panel renders only once opened, so neither reaches the
// Layout Lock baseline either.
// SPEC 11.6's mic. SPEC 3's component list has no file for it, so it is rendered
// here beside the other app-level mounts rather than inventing a module outside
// the tree — the precedent P4 set with readReceiptsAloud and P5 with
// useDialogSheet.
//
// SPEC 10: "sits bottom-right above the TabBar, rendered only if speech
// recognition is supported". It is also gated on SPEC 10's own "Voice input"
// setting, which is the control that names this feature.
function MicButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const voiceInput = useSettings((state) => state.voiceInput);
  const alwaysListening = useSettings((state) => state.alwaysListening);
  const [listening, setListening] = useState(false);
  const stop = useRef<(() => void) | null>(null);

  // Support is a property of the browser, not of a render, so it is read once.
  const [supported] = useState(speechRecognitionSupported);

  // SPEC 11.7 scopes intents by "the current route", and a recogniser result
  // arrives long after the callback that will read it was created — so the route
  // is taken from a ref rather than closed over. Saying "explain" on Post Box
  // must reach the reading mode even if the mic was tapped on the way in.
  const route = useRef(pathname);
  route.current = pathname;

  const begin = () => {
    setListening(true);
    stop.current = listen({
      onResult: (transcript) => runIntent(transcript, { route: route.current, navigate }),
      onEnd: () => setListening(false),
    });
  };

  useEffect(() => () => stop.current?.(), []);

  // SPEC 11.7's "Always listening": "recognition auto-restarts on `onend` so no
  // button press is needed". The restart itself lives inside listen(); this
  // effect only opens the first session and closes it when the setting goes off.
  //
  // `listening` is deliberately NOT a dependency. With it, listen()'s own
  // give-up guard would be undone the instant it fired — the component would
  // reopen the session it had just abandoned, which is the loop the guard
  // exists to end.
  useEffect(() => {
    if (!supported || !voiceInput || !alwaysListening) return undefined;

    begin();
    return () => {
      stop.current?.();
      stop.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported, voiceInput, alwaysListening]);

  if (!supported || !voiceInput) return null;

  // SPEC 11.6: "tap toggles listening".
  const toggle = () => {
    if (listening) {
      stop.current?.();
      return;
    }
    begin();
  };

  // SPEC 15 item 10: "mic button announces listening state" — aria-pressed
  // carries it, so the accessible name stays exactly SPEC 11.6's label.
  // The pulse ring is behind prefers-reduced-motion like every other animation
  // (SPEC 4 / 15).
  //
  // z-40 puts the mic ABOVE the sheets (z-30). SPEC 11.6's "confirm"/"yes" and
  // "cancel"/"no" act on "the open sheet if any", and a tap is the only way to
  // start listening — so at z-20 the sheet covered the one control those two
  // intents exist for, and they were unreachable in practice. It is also the
  // only non-touch route to approving SPEC 11.2's Tap & Tell sheet, which P5
  // recorded as a deliberate SPEC 15 gap. The dialogs keep aria-modal and their
  // focus trap; this is a physical push-to-talk button sitting over them, not a
  // member of the dialog.
  return (
    <button
      type="button"
      aria-label="Talk to Penny"
      aria-pressed={listening}
      onClick={toggle}
      className={`fixed bottom-[60px] right-4 z-40 flex h-[56px] w-[56px] items-center justify-center rounded-full bg-amber text-bg ${
        listening ? "mic-listening" : ""
      }`}
    >
      {/* Everything inside the button is decorative — aria-label above is the
          accessible name, and aria-pressed is the state. So the listening
          treatment can be as elaborate as it likes without reaching the
          accessibility tree: SPEC 16's baseline still reads
          `button "Talk to Penny"` either way.

          The halo overflows the button by 12px a side. It is pointer-events:
          none, so the tap target is still exactly the 56px SPEC 4 asks for.
          It needs no `relative` alongside `fixed` — a fixed element is already
          a containing block, and adding one costs the button its fixed
          position outright, since Tailwind emits .relative after .fixed. */}
      {listening && <span aria-hidden="true" className="mic-halo" />}

      {listening ? (
        <span aria-hidden="true" className="flex items-center gap-[3px]">
          <span className="mic-bar" />
          <span className="mic-bar" />
          <span className="mic-bar" />
          <span className="mic-bar" />
        </span>
      ) : (
        <span aria-hidden="true" className="text-card">
          ●
        </span>
      )}
    </button>
  );
}

export default function App() {
  const unlocked = useSession((state) => state.unlocked);
  const pendingTap = useDirector((state) => state.pendingTap);
  const { pathname } = useLocation();

  return (
    <>
      {unlocked ? (
        <>
          <Header title={TITLES[pathname] ?? "Home"} />
          <main className="px-4 pb-[72px] pt-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/postbox" element={<PostBox />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/journey" element={<Journey />} />
              {/* SPEC 12.1's backup route: the panel opens itself on arrival,
                  and Home is what sits behind it. */}
              <Route path="/director" element={<Home />} />
            </Routes>
          </main>
          <TabBar />
          {/* SPEC 10 reads Header · TabBar · floating mic, so the mic follows
              the nav in DOM order as well as visually. */}
          <MicButton />
          {pendingTap && <TapTellSheet push={pendingTap} />}
          {/* SPEC 11.7 makes `order_card` global, so the sheet it raises is
              mounted app-wide rather than inside Post Box. Like the payment
              sheet and the text cards it renders nothing until asked, so SPEC
              16's route walk never sees it. */}
          <OrderCardSheet />
          <TextCards />
          <DirectorPanel />
        </>
      ) : (
        <Splash />
      )}
      {/* Outside the gate so SPEC 15's singleton is never unmounted. */}
      <LiveRegion />
    </>
  );
}
