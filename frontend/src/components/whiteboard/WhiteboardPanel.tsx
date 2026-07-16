import { useRef, useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import { Button } from "../ui";
import { WhiteboardStroke, WhiteboardTool } from "../../types";
import { useThrottle } from "../../hooks/useThrottle";

const COLORS = ["#ef4444", "#22c55e", "#3b82f6", "#eab308", "#a855f7", "#ffffff", "#000000"];
const SIZES = [2, 4, 8, 12, 20];

interface WhiteboardPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  socket: Socket | null;
  initialStrokes?: WhiteboardStroke[];
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: WhiteboardStroke) {
  if (!stroke.points.length) return;
  const { tool, color, size, points } = stroke;

  if (tool === "text" && stroke.text) {
    ctx.fillStyle = color;
    ctx.font = `${Math.max(14, size * 4)}px sans-serif`;
    ctx.fillText(stroke.text, points[0].x, points[0].y);
    return;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = tool === "eraser" ? size * 3 : size;
  ctx.strokeStyle = tool === "eraser" ? "#1a1a2e" : color;

  if (tool === "pencil" || tool === "eraser") {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    return;
  }

  const start = points[0];
  const end = points[points.length - 1];
  ctx.beginPath();

  if (tool === "rectangle") {
    ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
  } else if (tool === "circle") {
    const rx = Math.abs(end.x - start.x) / 2;
    const ry = Math.abs(end.y - start.y) / 2;
    ctx.ellipse(
      start.x + (end.x - start.x) / 2,
      start.y + (end.y - start.y) / 2,
      rx,
      ry,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  } else if (tool === "line") {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
  } else if (tool === "arrow") {
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const head = 12;
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - head * Math.cos(angle - Math.PI / 6),
      end.y - head * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - head * Math.cos(angle + Math.PI / 6),
      end.y - head * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }
}

function redrawAll(
  canvas: HTMLCanvasElement,
  strokes: WhiteboardStroke[],
  preview?: WhiteboardStroke | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const s of strokes) drawStroke(ctx, s);
  if (preview) drawStroke(ctx, preview);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function WhiteboardPanel({
  open,
  onClose,
  roomId,
  socket,
  initialStrokes = [],
}: WhiteboardPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<WhiteboardTool>("pencil");
  const [color, setColor] = useState("#ffffff");
  const [size, setSize] = useState(4);
  const [strokes, setStrokes] = useState<WhiteboardStroke[]>(initialStrokes);
  const strokesRef = useRef(strokes);
  const drawing = useRef(false);
  const current = useRef<WhiteboardStroke | null>(null);

  const emitDrawUpdate = useThrottle(
    (strokeId: string, points: { x: number; y: number }[]) => {
      socket?.emit("draw-update", { roomId, strokeId, points });
    },
    32
  );

  useEffect(() => {
    strokesRef.current = strokes;
    if (open && canvasRef.current) redrawAll(canvasRef.current, strokes);
  }, [strokes, open]);

  useEffect(() => {
    if (initialStrokes.length) setStrokes(initialStrokes);
  }, [initialStrokes]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * (window.devicePixelRatio || 1);
    canvas.height = canvas.offsetHeight * (window.devicePixelRatio || 1);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      canvas.style.width = canvas.offsetWidth + "px";
      canvas.style.height = canvas.offsetHeight + "px";
    }
    // Fix: set logical size simpler
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    redrawAll(canvas, strokesRef.current);
  }, [open]);

  useEffect(() => {
    if (!socket) return;

    const onStart = ({ stroke }: { stroke: WhiteboardStroke }) => {
      setStrokes((prev) => {
        if (prev.some((s) => s.id === stroke.id)) return prev;
        return [...prev, stroke];
      });
    };
    const onUpdate = ({
      strokeId,
      points,
    }: {
      strokeId: string;
      points: { x: number; y: number }[];
    }) => {
      setStrokes((prev) =>
        prev.map((s) => (s.id === strokeId ? { ...s, points } : s))
      );
    };
    const onEnd = ({ stroke }: { stroke: WhiteboardStroke }) => {
      setStrokes((prev) => {
        const idx = prev.findIndex((s) => s.id === stroke.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = stroke;
          return next;
        }
        return [...prev, stroke];
      });
    };
    const onClear = () => setStrokes([]);
    const onUndo = ({ strokes: next }: { strokes: WhiteboardStroke[] }) => setStrokes(next);
    const onRedo = ({ strokes: next }: { strokes: WhiteboardStroke[] }) => setStrokes(next);
    const onSync = ({ strokes: next }: { strokes: WhiteboardStroke[] }) => setStrokes(next);

    socket.on("draw-start", onStart);
    socket.on("draw-update", onUpdate);
    socket.on("draw-end", onEnd);
    socket.on("canvas-clear", onClear);
    socket.on("undo", onUndo);
    socket.on("redo", onRedo);
    socket.on("whiteboard-sync", onSync);

    return () => {
      socket.off("draw-start", onStart);
      socket.off("draw-update", onUpdate);
      socket.off("draw-end", onEnd);
      socket.off("canvas-clear", onClear);
      socket.off("undo", onUndo);
      socket.off("redo", onRedo);
      socket.off("whiteboard-sync", onSync);
    };
  }, [socket]);

  const getPos = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / Math.max(1, rect.width);
    const scaleY = canvasRef.current!.height / Math.max(1, rect.height);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = getPos(e.clientX, e.clientY);
    if (tool === "text") {
      const text = window.prompt("Enter text:");
      if (!text) return;
      const stroke: WhiteboardStroke = {
        id: uid(),
        tool: "text",
        color,
        size,
        points: [pos],
        text,
      };
      setStrokes((prev) => [...prev, stroke]);
      socket?.emit("draw-end", { roomId, stroke });
      return;
    }
    drawing.current = true;
    const stroke: WhiteboardStroke = {
      id: uid(),
      tool,
      color,
      size,
      points: [pos],
    };
    current.current = stroke;
    setStrokes((prev) => [...prev, stroke]);
    socket?.emit("draw-start", { roomId, stroke });
  };

  const handleMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !current.current) return;
    const pos = getPos(e.clientX, e.clientY);
    const stroke = current.current;
    if (stroke.tool === "pencil" || stroke.tool === "eraser") {
      stroke.points.push(pos);
    } else {
      stroke.points = [stroke.points[0], pos];
    }
    setStrokes((prev) => prev.map((s) => (s.id === stroke.id ? { ...stroke } : s)));
    emitDrawUpdate(stroke.id, stroke.points);
  };

  const handleUp = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (!drawing.current || !current.current) return;
    drawing.current = false;
    socket?.emit("draw-end", { roomId, stroke: current.current });
    current.current = null;
  };

  const tools: WhiteboardTool[] = [
    "pencil",
    "eraser",
    "rectangle",
    "circle",
    "line",
    "arrow",
    "text",
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="flex h-[100dvh] w-full max-w-5xl flex-col rounded-none border-0 border-border bg-bg-secondary shadow-2xl sm:h-[85vh] sm:rounded-xl sm:border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="font-semibold">Collaborative Whiteboard</h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            ✕ Close
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2">
          {tools.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={tool === t ? "primary" : "secondary"}
              onClick={() => setTool(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
          <div className="mx-2 h-6 w-px bg-border" />
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full border-2 touch-manipulation ${color === c ? "border-white" : "border-transparent"}`}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="mx-2 h-6 w-px bg-border" />
          {SIZES.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`rounded px-2 py-1.5 text-xs touch-manipulation ${size === s ? "bg-accent text-white" : "bg-bg-tertiary"}`}
            >
              {s}px
            </button>
          ))}
          <div className="ml-auto flex gap-1">
            <Button size="sm" variant="secondary" onClick={() => socket?.emit("undo", { roomId })}>
              Undo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => socket?.emit("redo", { roomId })}>
              Redo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => socket?.emit("canvas-clear", { roomId })}
            >
              Clear
            </Button>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="flex-1 touch-none cursor-crosshair"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerCancel={handleUp}
          onPointerLeave={handleUp}
        />
      </div>
    </div>
  );
}

export function WhiteboardButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-24 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-xl shadow-lg transition-transform hover:scale-105 hover:bg-accent-hover sm:bottom-20 sm:right-6 sm:h-14 sm:w-14 sm:text-2xl lg:flex"
      title="Open Whiteboard"
    >
      🎨
    </button>
  );
}
