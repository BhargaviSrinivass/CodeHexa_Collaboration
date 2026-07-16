import { useState, useRef, useEffect, FormEvent, memo } from "react";
import { Button, Input } from "../ui";
import { api } from "../../services/api";

interface AIPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  problemTitle: string;
  problemDescription: string;
  problemId?: string;
  difficulty?: "EASY" | "MEDIUM" | "HARD";
  code: string;
  language: string;
  selection?: string;
  lastRunError?: { stderr?: string; stdout?: string };
  onHintUsed?: () => void;
}

type Tab = "ask" | "tools";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

function SimpleMarkdown({ text }: { text: string }) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith("```")) {
          const inner = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
          return (
            <pre
              key={i}
              className="overflow-x-auto rounded-lg bg-bg-primary p-2 font-mono text-xs text-text-secondary"
            >
              {inner}
            </pre>
          );
        }
        return (
          <div key={i} className="whitespace-pre-wrap text-text-secondary">
            {part.split(/(\*\*[^*]+\*\*)/g).map((s, j) =>
              s.startsWith("**") && s.endsWith("**") ? (
                <strong key={j} className="text-text-primary">
                  {s.slice(2, -2)}
                </strong>
              ) : (
                <span key={j}>{s}</span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

export const AIPanel = memo(function AIPanel({
  open,
  onClose,
  roomId,
  problemTitle,
  problemDescription,
  problemId,
  difficulty,
  code,
  language,
  selection,
  lastRunError,
  onHintUsed,
}: AIPanelProps) {
  const [tab, setTab] = useState<Tab>("ask");
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, output]);

  if (!open) return null;

  const runTool = async (fn: () => Promise<string>) => {
    setLoading(true);
    setTab("tools");
    setOutput("");
    try {
      const text = await fn();
      setOutput(text);
    } catch (err) {
      setOutput((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleHint = () =>
    runTool(async () => {
      const res = await api.aiHint({
        problemTitle,
        description: problemDescription,
        hintLevel,
        code,
        language,
        roomId,
        problemId,
      });
      onHintUsed?.();
      setHintLevel((l) => Math.min(3, l + 1));
      return res.hint;
    });

  const handleReview = () =>
    runTool(async () => {
      const res = await api.aiReview({ code, language, problemTitle, roomId });
      return res.score != null ? `${res.review}` : res.review;
    });

  const handleComplexity = () =>
    runTool(async () => {
      const res = await api.aiComplexity({ code, language, roomId });
      return res.analysis;
    });

  const handleEdge = () =>
    runTool(async () => {
      const res = await api.aiEdgeCases({
        code,
        language,
        problemTitle,
        description: problemDescription,
        roomId,
      });
      return res.edgeCases;
    });

  const handleDebug = () =>
    runTool(async () => {
      const res = await api.aiDebug({
        code,
        language,
        stderr: lastRunError?.stderr,
        stdout: lastRunError?.stdout,
        roomId,
      });
      return res.debug;
    });

  const handleExplain = () =>
    runTool(async () => {
      const sel = selection || code.slice(0, 500);
      const res = await api.aiExplain({
        selection: sel,
        language,
        roomId,
      });
      return res.explanation;
    });

  const sendChat = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput("");
    setHistory((h) => [...h, { role: "user", content: msg }]);
    setLoading(true);
    try {
      const res = await api.aiChat({
        message: msg,
        sessionId,
        roomId,
        history: history.slice(-10),
      });
      setSessionId(res.sessionId);
      setHistory((h) => [...h, { role: "assistant", content: res.reply }]);
    } catch (err) {
      setHistory((h) => [...h, { role: "assistant", content: (err as Error).message }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-bg-secondary">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div>
          <h3 className="text-sm font-semibold">AI Mentor</h3>
          <p className="text-[10px] text-text-secondary">Guides — never dumps full solutions</p>
        </div>
        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
          ✕
        </button>
      </div>

      <div className="flex border-b border-border text-xs">
        <button
          className={`flex-1 py-2 ${tab === "ask" ? "border-b-2 border-accent text-accent" : "text-text-secondary"}`}
          onClick={() => setTab("ask")}
        >
          Ask AI
        </button>
        <button
          className={`flex-1 py-2 ${tab === "tools" ? "border-b-2 border-accent text-accent" : "text-text-secondary"}`}
          onClick={() => setTab("tools")}
        >
          Tools
        </button>
      </div>

      {tab === "tools" && (
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          <Button size="sm" variant="secondary" disabled={loading} onClick={handleHint}>
            Need Hint? ({hintLevel}/3)
          </Button>
          <Button size="sm" variant="secondary" disabled={loading} onClick={handleReview}>
            Review Code
          </Button>
          <Button size="sm" variant="secondary" disabled={loading} onClick={handleComplexity}>
            Complexity
          </Button>
          <Button size="sm" variant="secondary" disabled={loading} onClick={handleEdge}>
            Edge Cases
          </Button>
          <Button size="sm" variant="secondary" disabled={loading} onClick={handleDebug}>
            Debug
          </Button>
          <Button size="sm" variant="secondary" disabled={loading} onClick={handleExplain}>
            Explain Selection
          </Button>
        </div>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {tab === "ask" && history.length === 0 && !loading && (
          <p className="text-xs text-text-secondary">
            Ask why a HashMap helps, what O(n) means, BFS vs DFS, and more.
          </p>
        )}
        {tab === "ask" &&
          history.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <div
                className={`inline-block max-w-full rounded-lg px-3 py-2 text-left ${
                  m.role === "user" ? "bg-accent/20 text-text-primary" : "bg-bg-primary"
                }`}
              >
                <SimpleMarkdown text={m.content} />
              </div>
            </div>
          ))}
        {tab === "tools" && (
          <div>
            {loading && <p className="animate-pulse text-xs text-text-secondary">Thinking…</p>}
            {output && <SimpleMarkdown text={output} />}
            {!loading && !output && (
              <p className="text-xs text-text-secondary">
                Pick a tool above. Progressive hints never reveal full code.
              </p>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {tab === "ask" && (
        <form onSubmit={sendChat} className="border-t border-border p-2">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the mentor…"
              className="flex-1"
            />
            <Button type="submit" size="sm" disabled={loading || !input.trim()}>
              {loading ? "…" : "Send"}
            </Button>
          </div>
        </form>
      )}

      {difficulty && (
        <p className="border-t border-border px-3 py-1 text-[10px] text-text-secondary">
          Tracking progress for {difficulty} problems
        </p>
      )}
    </aside>
  );
});

export function AIPanelButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-bg-tertiary text-xl shadow-lg ring-1 ring-border transition-transform hover:scale-105 hover:ring-accent"
      title="AI Mentor"
    >
      ✨
    </button>
  );
}
