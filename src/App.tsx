import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import LiveRegion from "./components/LiveRegion";
import Splash from "./components/Splash";
import TabBar from "./components/TabBar";
import Home from "./screens/Home";
import PostBox from "./screens/PostBox";
import Receipts from "./screens/Receipts";
import Settings from "./screens/Settings";
import Journey from "./screens/Journey";
import { useSession } from "./state/session";

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

// SPEC 3: router, Splash gate, LiveRegion. The DirectorPanel mount and its
// /director route arrive in P6. Journey is routed but is not a tab (SPEC 10).
//
// Body order is SPEC 10's canonical order: header · main · nav.
export default function App() {
  const unlocked = useSession((state) => state.unlocked);
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
            </Routes>
          </main>
          <TabBar />
        </>
      ) : (
        <Splash />
      )}
      {/* Outside the gate so SPEC 15's singleton is never unmounted. */}
      <LiveRegion />
    </>
  );
}
