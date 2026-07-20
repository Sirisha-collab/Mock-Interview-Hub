import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: "◈", end: true },
  { to: "/questions", label: "Questions", icon: "☰" },
  { to: "/practice", label: "Practice", icon: "●" },
  { to: "/review", label: "Review", icon: "▤" },
  { to: "/statistics", label: "Statistics", icon: "▲" },
];

export default function Sidebar() {
  return (
    <aside className="w-full md:w-64 shrink-0 bg-ink-950 text-paper flex md:flex-col md:h-screen md:sticky md:top-0">
      <div className="px-6 py-6 hidden md:block">
        <p className="eyebrow text-signal">On the record</p>
        <h1 className="font-display text-2xl leading-tight mt-1">
          Interview
          <br />
          Practice Studio
        </h1>
      </div>

      <nav className="flex md:flex-col flex-1 justify-around md:justify-start md:gap-1 md:px-3 md:py-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `flex md:flex-row flex-col items-center gap-1 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                isActive
                  ? "bg-ink-800 text-signal"
                  : "text-ink-600 hover:text-paper hover:bg-ink-900"
              }`
            }
          >
            <span className="text-base md:text-sm w-5 text-center" aria-hidden="true">
              {link.icon}
            </span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="hidden md:block px-6 py-5 text-xs text-ink-600 border-t border-ink-800">
        <p>Runs fully offline.</p>
        <p>Backend: localhost:8000</p>
      </div>
    </aside>
  );
}
