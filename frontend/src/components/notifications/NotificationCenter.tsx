import { useEffect, useState, useRef } from "react";
import { api } from "../../services/api";
import { AppNotification } from "../../types";
import { useSocket } from "../../contexts/SocketContext";

export function NotificationCenter() {
  const { socket } = useSocket();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const load = () => {
    api.getNotifications().then(setItems).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("notification", refresh);
    socket.on("friend-request", refresh);
    return () => {
      socket.off("notification", refresh);
      socket.off("friend-request", refresh);
    };
  }, [socket]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    await api.readNotifications();
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg border border-border px-2 py-1 text-sm hover:bg-bg-tertiary"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-bg-secondary shadow-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h4 className="text-sm font-semibold">Notifications</h4>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="text-[10px] text-accent hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-8 text-center text-xs text-text-secondary">You&apos;re all caught up</li>
            ) : (
              items.slice(0, 20).map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-border px-4 py-3 text-sm ${
                    n.read ? "opacity-70" : "bg-accent/5"
                  }`}
                >
                  <p className="font-medium">{n.title}</p>
                  <p className="text-xs text-text-secondary">{n.body}</p>
                  <p className="mt-1 text-[10px] text-text-secondary">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
