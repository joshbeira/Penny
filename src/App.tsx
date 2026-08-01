import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
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
import { runIntent } from "./lib/intents";
import { listen, speechRecognitionSupported } from "./lib/voiceInput";
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
  const voiceInput = useSettings((state) => state.voiceInput);
  const [listening, setListening] = useState(false);
  const stop = useRef<(() => void) | null>(null);

  // Support is a property of the browser, not of a render, so it is read once.
  const [supported] = useState(speechRecognitionSupported);

  useEffect(() => () => stop.current?.(), []);

  if (!supported || !voiceInput) return null;

  // SPEC 11.6: "tap toggles listening".
  const toggle = () => {
    if (listening) {
      stop.current?.();
      return;
    }
    setListening(true);
    stop.current = listen({
      onResult: (transcript) => runIntent(transcript, { navigate }),
      onEnd: () => setListening(false),
    });
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
      {/* The glyph is decorative: aria-label above is the accessible name. */}
      <span aria-hidden="true" className="text-card">
        ●
      </span>
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
