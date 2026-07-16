import { useEffect, useState, useRef, memo } from "react";
import { Socket } from "socket.io-client";
import { useThrottle } from "../../hooks/useThrottle";
import { useAuth } from "../../contexts/AuthContext";
import { Participant } from "../../types";

interface PointerCursor {
  userId: string;
  username: string;
  color: string;
  x: number;
  y: number;
}

interface LiveCursorsOverlayProps {
  roomId: string;
  socket: Socket | null;
  containerRef: React.RefObject<HTMLElement | null>;
  participants: Participant[];
}

export const LiveCursorsOverlay = memo(function LiveCursorsOverlay({
  roomId,
  socket,
  containerRef,
  participants,
}: LiveCursorsOverlayProps) {
  const { user } = useAuth();
  const [cursors, setCursors] = useState<Map<string, PointerCursor>>(new Map());
  const myColor =
    participants.find((p) => p.id === user?.id)?.cursorColor || "#3b82f6";

  const emitPointer = useThrottle((x: number, y: number) => {
    socket?.emit("pointer-move", {
      roomId,
      x,
      y,
      color: myColor,
    });
  }, 40);

  useEffect(() => {
    if (!socket) return;

    const onPointer = (data: {
      userId: string;
      username: string;
      color: string;
      x: number;
      y: number;
    }) => {
      if (data.userId === user?.id) return;
      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          username: data.username,
          color: data.color,
          x: data.x,
          y: data.y,
        });
        return next;
      });
    };

    const onLeft = (data: { userId: string }) => {
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    };

    socket.on("pointer-move", onPointer);
    socket.on("participant-left", onLeft);
    socket.on("user-left", onLeft);

    return () => {
      socket.off("pointer-move", onPointer);
      socket.off("participant-left", onLeft);
      socket.off("user-left", onLeft);
    };
  }, [socket, user?.id]);

  // Track mouse anywhere over the room viewport (including Monaco)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !socket) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }
      const x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 100;
      const y = ((e.clientY - rect.top) / Math.max(1, rect.height)) * 100;
      emitPointer(x, y);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [socket, containerRef, emitPointer]);

  return (
    <div className="pointer-events-none absolute inset-0 z-[80] overflow-hidden">
      {Array.from(cursors.values()).map((c) => (
        <div
          key={c.userId}
          className="absolute will-change-transform"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transform: "translate(-2px, -2px)",
            transition: "left 0.07s linear, top 0.07s linear",
          }}
        >
          <svg width="18" height="22" viewBox="0 0 16 20" fill="none">
            <path
              d="M1 1L1 15L5 11L9 18L11.5 17L7.5 10L14 10L1 1Z"
              fill={c.color}
              stroke="#0a0a0a"
              strokeWidth="0.8"
            />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-md"
            style={{ backgroundColor: c.color }}
          >
            {c.username}
          </span>
        </div>
      ))}
    </div>
  );
});
