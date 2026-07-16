import { memo } from "react";
import { Participant } from "../../types";

interface PresenceBannerProps {
  participants: Participant[];
  typingUsers: string[];
  currentUserId?: string;
  /** username → line being edited (from cursor updates) */
  editingLines?: Record<string, number>;
}

export const PresenceBanner = memo(function PresenceBanner({
  participants,
  typingUsers,
  currentUserId,
  editingLines = {},
}: PresenceBannerProps) {
  const lines: string[] = [];

  for (const u of typingUsers) {
    lines.push(`${u} is typing…`);
  }

  for (const p of participants) {
    if (p.id === currentUserId || !p.online) continue;

    const editLine = editingLines[p.username] ?? editingLines[p.id];
    if (editLine != null && (p.presence === "editing-code" || editLine > 0)) {
      lines.push(`${p.username} is editing line ${editLine}`);
      continue;
    }

    if (p.presence === "editing-code") {
      lines.push(`${p.username} is editing code`);
    } else if (p.presence === "whiteboard") {
      lines.push(`${p.username} is on the whiteboard`);
    } else if (p.speaking) {
      lines.push(`${p.username} is speaking`);
    }
  }

  const unique = [...new Set(lines)].slice(0, 3);
  if (unique.length === 0) return null;

  return (
    <div className="border-b border-border bg-accent/5 px-3 py-1.5 text-[11px] text-text-secondary">
      {unique.map((line) => (
        <p key={line} className="truncate">
          {line}
        </p>
      ))}
    </div>
  );
});
