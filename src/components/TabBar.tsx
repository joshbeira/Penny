import { NavLink } from "react-router-dom";

// SPEC 10: fixed order — Home, Post Box, Receipts, Settings. This order is the
// Layout Lock baseline (SPEC 16); never reorder. Journey is not a tab.
const TABS = [
  { to: "/", label: "Home" },
  { to: "/postbox", label: "Post Box" },
  { to: "/receipts", label: "Receipts" },
  { to: "/settings", label: "Settings" },
] as const;

// min-h-12 is SPEC 4's 48px minimum tap target. Colour tokens arrive in P1.
export default function TabBar() {
  return (
    <nav>
      <ul className="fixed inset-x-0 bottom-0 flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === "/"}
              className="flex min-h-12 items-center justify-center"
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
