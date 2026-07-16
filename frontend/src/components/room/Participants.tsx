import { memo, useState } from "react";
import { Participant } from "../../types";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface ParticipantsProps {
  participants: Participant[];
  hostId?: string;
  currentUserId?: string;
  isHost: boolean;
  onRemove: (userId: string) => void;
  onTransferHost: (userId: string) => void;
  collapsed?: boolean;
}

function avatarLetter(name: string) {
  return (name?.[0] || "?").toUpperCase();
}

function presenceLabel(p?: string) {
  switch (p) {
    case "idle":
      return "Idle";
    case "typing":
      return "Typing";
    case "speaking":
      return "Speaking";
    case "whiteboard":
      return "Whiteboard";
    case "editing-code":
      return "Editing";
    default:
      return "Online";
  }
}

export const Participants = memo(function Participants({
  participants,
  hostId,
  currentUserId,
  isHost,
  onRemove,
  onTransferHost,
  collapsed,
}: ParticipantsProps) {
  const [confirm, setConfirm] = useState<{
    type: "remove" | "transfer";
    userId: string;
    username: string;
  } | null>(null);

  if (collapsed) return null;

  return (
    <div className="border-b border-border p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        Participants ({participants.filter((p) => p.online).length} online)
      </h3>
      <ul className="space-y-2">
        {participants.map((p) => {
          const host = p.isHost || p.id === hostId;
          return (
            <li
              key={p.id}
              className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-bg-tertiary/40"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ backgroundColor: p.cursorColor }}
                title={`Cursor: ${p.cursorColor}`}
              >
                {avatarLetter(p.username)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium">{p.username}</span>
                  {host && (
                    <span className="rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                      Host
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                  <span
                    className={
                      p.presence === "speaking" || p.speaking
                        ? "text-warning"
                        : p.online
                          ? "text-success"
                          : ""
                    }
                  >
                    {p.online ? `● ${presenceLabel(p.presence || (p.speaking ? "speaking" : "online"))}` : "○ Offline"}
                  </span>
                </div>
              </div>
              {isHost && p.id !== currentUserId && (
                <div className="hidden gap-1 group-hover:flex">
                  <button
                    className="rounded px-1 text-[10px] text-text-secondary hover:text-accent"
                    title="Transfer host"
                    onClick={() =>
                      setConfirm({ type: "transfer", userId: p.id, username: p.username })
                    }
                  >
                    Host
                  </button>
                  <button
                    className="rounded px-1 text-[10px] text-text-secondary hover:text-error"
                    title="Remove"
                    onClick={() =>
                      setConfirm({ type: "remove", userId: p.id, username: p.username })
                    }
                  >
                    Kick
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === "remove" ? "Remove participant?" : "Transfer host?"}
        message={
          confirm?.type === "remove"
            ? `Remove ${confirm.username} from this room?`
            : `Make ${confirm?.username} the new host?`
        }
        confirmLabel={confirm?.type === "remove" ? "Remove" : "Transfer"}
        danger={confirm?.type === "remove"}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "remove") onRemove(confirm.userId);
          else onTransferHost(confirm.userId);
          setConfirm(null);
        }}
      />
    </div>
  );
});
