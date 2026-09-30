import { NavLink } from "react-router-dom";
const TABS = [
  { to: "/", label: "Home" },
  { to: "/postbox", label: "Post Box" },
  { to: "/library", label: "Library" },
  { to: "/settings", label: "Settings" },
] as const;
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
