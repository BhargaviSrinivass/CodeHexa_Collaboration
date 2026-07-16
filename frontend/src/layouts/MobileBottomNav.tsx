import { Link, useLocation } from "react-router-dom";

const items = [
  { path: "/dashboard", label: "Home", icon: "⌂" },
  { path: "/problems", label: "Problems", icon: "◈" },
  { path: "/search", label: "Search", icon: "⌕" },
  { path: "/friends", label: "Friends", icon: "☺" },
  { path: "/profile", label: "Profile", icon: "◎" },
];

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-bg-secondary/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="flex h-14 items-stretch justify-around px-1">
        {items.map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <li key={item.path} className="flex-1">
              <Link
                to={item.path}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[10px] ${
                  active ? "font-semibold text-accent" : "text-text-secondary"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
