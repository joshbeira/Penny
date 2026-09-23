import { useEffect, useRef, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { OrderCardSheet } from "./components/ConfirmSheet";
import SandboxPanel from "./components/SandboxPanel";
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
import {
  listen,
  runIntent,
  speechRecognitionSupported,
} from "./lib/voiceInput";
import { useSandbox } from "./state/sandbox";
import { useSession } from "./state/session";
import { useSettings } from "./state/settings";
const TITLES: Record<string, string> = {
  "/": "Home",
  "/postbox": "Post Box",
  "/receipts": "Receipts",
  "/settings": "Settings",
  "/journey": "One customer. Three years.",
};
function MicButton() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const voiceInput = useSettings((state) => state.voiceInput);
  const alwaysListening = useSettings((state) => state.alwaysListening);
  const [listening, setListening] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  const [supported] = useState(speechRecognitionSupported);
  const route = useRef(pathname);
  route.current = pathname;

  const begin = () => {
    setListening(true);
    stop.current = listen({
      onResult: (transcript) =>
        runIntent(transcript, { route: route.current, navigate }),
      onEnd: () => setListening(false),
    });
  };

  useEffect(() => () => stop.current?.(), []);
  useEffect(() => {
    if (!supported || !voiceInput || !alwaysListening) return undefined;

    begin();
    return () => {
      stop.current?.();
      stop.current = null;
    };
  }, [supported, voiceInput, alwaysListening]);

  if (!supported || !voiceInput) return null;
  const toggle = () => {
    if (listening) {
      stop.current?.();
      return;
    }
    begin();
  };
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
  const pendingTap = useSandbox((state) => state.pendingTap);
  const { pathname } = useLocation();

  return (
    <>
      {unlocked ? (
        <>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Header title={TITLES[pathname] ?? "Home"} />
          <main id="main-content" className="app-main px-4 pb-[112px] pt-4">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/postbox" element={<PostBox />} />
              <Route path="/receipts" element={<Receipts />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/journey" element={<Journey />} />

              <Route path="/sandbox" element={<Home />} />
              <Route path="/director" element={<Home />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <TabBar />

          <MicButton />
          {pendingTap && <TapTellSheet push={pendingTap} />}

          <OrderCardSheet />
          <TextCards />
          <SandboxPanel />
        </>
      ) : (
        <Splash />
      )}

      <LiveRegion />
    </>
  );
}
