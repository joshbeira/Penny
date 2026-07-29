import { NavLink } from "react-router-dom";

// SPEC 10: fixed order — Home, Post Box, Receipts, Settings. This order is the
// Layout Lock baseline (SPEC 16); never reorder. Journey is not a tab.
const TABS = [
  { to: "/", label: "Home" },
  { to: "/postbox", label: "Post Box" },
  { to: "/receipts", label: "Receipts" },
  { to: "/settings", label: "Settings" },
] as const;

// min-h-[48px] is SPEC 4's minimum tap target, written as a px literal because
// the root font-size is 18px, so rem utilities no longer land on the pinned
// pixel values (see styles.css). Amber is SPEC 4's only accent.
export default function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-hairline bg-surface">
      <ul className="flex">
        {TABS.map((tab) => (
          <li key={tab.to} className="flex-1">
            <NavLink
              to={tab.to}
              end={tab.to === "/"}
              className={({ isActive }) =>
                `flex min-h-[48px] items-center justify-center px-2 text-caption ${
                  isActive ? "text-amber" : "text-text-dim"
                }`
              }
            >
              {tab.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
