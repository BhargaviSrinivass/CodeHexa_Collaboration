import { memo } from "react";

export type RoomMobileTab = "problem" | "code" | "chat" | "whiteboard" | "room";

const TABS: { id: RoomMobileTab; label: string; icon: string }[] = [
  { id: "problem", label: "Problem", icon: "📄" },
  { id: "code", label: "Code", icon: "⌨️" },
  { id: "chat", label: "Chat", icon: "💬" },
  { id: "whiteboard", label: "Board", icon: "✏️" },
  { id: "room", label: "Room", icon: "👥" },
];

interface RoomMobileTabsProps {
  active: RoomMobileTab;
  onChange: (tab: RoomMobileTab) => void;
}

export const RoomMobileTabs = memo(function RoomMobileTabs({
  active,
  onChange,
}: RoomMobileTabsProps) {
  return (
    <nav className="flex shrink-0 border-t border-border bg-bg-secondary pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
            active === t.id
              ? "font-semibold text-accent"
              : "text-text-secondary"
          }`}
        >
          <span className="text-sm leading-none">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </nav>
  );
});
