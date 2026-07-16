import { useState, useEffect } from "react";
import { Button, Input } from "../ui";
import { ConfirmDialog } from "../ui/ConfirmDialog";

interface RoomSettingsProps {
  open: boolean;
  onClose: () => void;
  isHost: boolean;
  name: string;
  maxParticipants: number;
  isPrivate: boolean;
  isLocked: boolean;
  roomCode: string;
  inviteLink: string;
  onSave: (settings: { name: string; maxParticipants: number; isPrivate: boolean }) => void;
  onLock: () => void;
  onUnlock: () => void;
}

export function RoomSettings({
  open,
  onClose,
  isHost,
  name,
  maxParticipants,
  isPrivate,
  isLocked,
  roomCode,
  inviteLink,
  onSave,
  onLock,
  onUnlock,
}: RoomSettingsProps) {
  const [localName, setLocalName] = useState(name);
  const [localMax, setLocalMax] = useState(maxParticipants);
  const [localPrivate, setLocalPrivate] = useState(isPrivate);
  const [confirmLock, setConfirmLock] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  useEffect(() => {
    if (open) {
      setLocalName(name);
      setLocalMax(maxParticipants);
      setLocalPrivate(isPrivate);
    }
  }, [open, name, maxParticipants, isPrivate]);

  if (!open) return null;

  const copy = async (text: string, kind: "link" | "code") => {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 2000);
  };

  const share = async () => {
    if (navigator.share) {
      await navigator.share({ title: localName || "CollabCode Room", url: inviteLink });
    } else {
      await copy(inviteLink, "link");
    }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(inviteLink)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-bg-secondary p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Room Settings</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Room Name</label>
            <Input
              value={localName}
              onChange={(e) => setLocalName(e.target.value)}
              disabled={!isHost}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Max Participants</label>
            <Input
              type="number"
              min={2}
              max={50}
              value={localMax}
              onChange={(e) => setLocalMax(Number(e.target.value))}
              disabled={!isHost}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Visibility</label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!isHost}
                onClick={() => setLocalPrivate(false)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  !localPrivate ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"
                } disabled:opacity-50`}
              >
                Public
              </button>
              <button
                type="button"
                disabled={!isHost}
                onClick={() => setLocalPrivate(true)}
                className={`rounded-lg px-3 py-1.5 text-sm ${
                  localPrivate ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"
                } disabled:opacity-50`}
              >
                Private
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-primary p-3">
            <p className="mb-1 text-xs text-text-secondary">Room Code</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-lg tracking-widest">{roomCode}</code>
              <Button size="sm" variant="secondary" onClick={() => copy(roomCode, "code")}>
                {copied === "code" ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-bg-primary p-3">
            <p className="mb-1 text-xs text-text-secondary">Invite Link</p>
            <p className="mb-2 truncate text-xs text-text-secondary">{inviteLink}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => copy(inviteLink, "link")}>
                {copied === "link" ? "Copied" : "Copy Link"}
              </Button>
              <Button size="sm" onClick={share}>
                Share
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center rounded-lg border border-border bg-bg-primary p-4">
            <p className="mb-2 text-xs text-text-secondary">QR Code</p>
            <img
              src={qrUrl}
              alt="Room invite QR code"
              width={160}
              height={160}
              className="rounded border border-border"
            />
            <p className="mt-2 font-mono text-sm tracking-widest">{roomCode}</p>
          </div>

          {isHost && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  onSave({
                    name: localName,
                    maxParticipants: localMax,
                    isPrivate: localPrivate,
                  });
                  onClose();
                }}
              >
                Save Settings
              </Button>
              {isLocked ? (
                <Button size="sm" variant="secondary" onClick={onUnlock}>
                  Unlock Room
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="text-warning" onClick={() => setConfirmLock(true)}>
                  Lock Room
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmLock}
        title="Lock room?"
        message="New participants will not be able to join until you unlock."
        confirmLabel="Lock"
        danger
        onCancel={() => setConfirmLock(false)}
        onConfirm={() => {
          onLock();
          setConfirmLock(false);
        }}
      />
    </div>
  );
}
