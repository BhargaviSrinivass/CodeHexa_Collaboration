import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { Logo } from "../components/brand/Logo";
import { NotificationCenter } from "../components/notifications/NotificationCenter";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: "⌂" },
  { path: "/problems", label: "Problems", icon: "◈" },
  { path: "/profile", label: "Profile", icon: "◎" },
  { path: "/analytics", label: "Analytics", icon: "▤" },
  { path: "/leaderboard", label: "Leaderboard", icon: "★" },
  { path: "/friends", label: "Friends", icon: "☺" },
  { path: "/sessions", label: "Sessions", icon: "☰" },
  { path: "/bookmarks", label: "Bookmarks", icon: "☆" },
  { path: "/search", label: "Search", icon: "⌕" },
  { path: "/join", label: "Join Room", icon: "↗" },
  { path: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const { theme, setTheme, resolved } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const cycleTheme = () => {
    const order = ["light", "dark", "system"] as const;
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  const nav = (
    <>
      <div className="border-b border-border p-4">
        <Link to="/dashboard" onClick={() => setOpen(false)}>
          <Logo size={32} />
        </Link>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-text-secondary">
          Collaboration
        </p>
      </div>

      <div className="px-3 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (query.trim()) {
              navigate(`/search?q=${encodeURIComponent(query.trim())}`);
              setOpen(false);
            }
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-xs focus:border-accent focus:outline-none"
          />
        </form>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setOpen(false)}
            className={`mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
              location.pathname.startsWith(item.path)
                ? "bg-accent/10 font-medium text-accent"
                : "text-text-secondary hover:bg-bg-tertiary/70 hover:text-text-primary"
            }`}
          >
            <span className="w-4 text-center text-xs opacity-70">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between">
          <NotificationCenter />
          <button
            type="button"
            onClick={cycleTheme}
            className="rounded-lg border border-border px-2 py-1 text-xs text-text-secondary hover:bg-bg-tertiary"
            title={`Theme: ${theme}`}
          >
            {resolved === "dark" ? "☾" : "☀"} {theme}
          </button>
        </div>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="flex w-full items-center gap-2 rounded-xl px-1 py-1 text-left hover:bg-bg-tertiary/50"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
            {(user?.username?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.username}</p>
            <p className="text-[10px] text-success">● Online</p>
          </div>
        </button>
        <button
          onClick={logout}
          className="text-xs text-text-secondary hover:text-accent"
        >
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="fixed left-3 top-3 z-40 rounded-xl border border-border bg-bg-secondary p-2 text-lg shadow-sm md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-bg-secondary transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {nav}
      </aside>
    </>
  );
}
