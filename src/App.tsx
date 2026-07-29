import { Route, Routes } from "react-router-dom";
import TabBar from "./components/TabBar";
import Home from "./screens/Home";
import PostBox from "./screens/PostBox";
import Receipts from "./screens/Receipts";
import Settings from "./screens/Settings";
import Journey from "./screens/Journey";

// P0 renders the router only. The Header, LiveRegion and Splash gate arrive in P1;
// the DirectorPanel mount and its /director route arrive in P6 (SPEC 3, 17).
// Journey is routed but is not a tab (SPEC 10).
export default function App() {
  return (
    <>
      <main className="pb-16">
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
  );
}
