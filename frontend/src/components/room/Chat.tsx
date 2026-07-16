import { useState, useRef, useEffect, FormEvent, memo } from "react";
import { ChatMessage } from "../../types";
import { Button, Input } from "../ui";

const EMOJIS = ["👍", "😂", "🎉", "🔥", "✅", "❌", "💡", "🤔", "👏", "❤️"];

interface ChatProps {
  messages: ChatMessage[];
  onSend: (content: string, messageType?: string) => void;
  onTypingStart: () => void;
  onTypingStop: () => void;
  typingUsers: string[];
}

export const Chat = memo(function Chat({
  messages,
  onSend,
  onTypingStart,
  onTypingStop,
  typingUsers,
}: ChatProps) {
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleTyping = (value: string) => {
    setInput(value);
    onTypingStart();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onTypingStop(), 1200);
  };

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim(), codeMode ? "code" : "text");
    setInput("");
    setCodeMode(false);
    onTypingStop();
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="border-b border-border px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Chat
        </h3>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-text-secondary">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="group text-sm">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-accent">{msg.user.username}</span>
              <span className="text-xs text-text-secondary">{formatTime(msg.createdAt)}</span>
              <button
                className="invisible text-[10px] text-text-secondary hover:text-accent group-hover:visible"
                onClick={() => copyMessage(msg.content)}
                title="Copy"
              >
                Copy
              </button>
            </div>
            {msg.messageType === "code" ? (
              <pre className="mt-1 overflow-x-auto rounded-lg bg-bg-primary p-2 text-xs text-text-secondary">
                {msg.content}
              </pre>
            ) : (
              <p className="mt-0.5 whitespace-pre-wrap text-text-secondary">{msg.content}</p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {typingUsers.length > 0 && (
        <p className="px-3 pb-1 text-xs text-text-secondary italic">
          {typingUsers.join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
        </p>
      )}

      <form onSubmit={handleSubmit} className="relative border-t border-border p-2">
        {showEmoji && (
          <div className="absolute bottom-full left-2 mb-1 flex flex-wrap gap-1 rounded-lg border border-border bg-bg-secondary p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                className="rounded p-1 text-lg hover:bg-bg-tertiary"
                onClick={() => {
                  setInput((v) => v + e);
                  setShowEmoji(false);
                }}
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="mb-1 flex gap-1">
          <button
            type="button"
            className="rounded px-2 text-sm hover:bg-bg-tertiary"
            onClick={() => setShowEmoji((v) => !v)}
            title="Emoji"
          >
            😊
          </button>
          <button
            type="button"
            className={`rounded px-2 text-xs ${codeMode ? "bg-accent text-white" : "hover:bg-bg-tertiary"}`}
            onClick={() => setCodeMode((v) => !v)}
            title="Code snippet"
          >
            {"</>"}
          </button>
        </div>
        <div className="flex gap-2">
          {codeMode ? (
            <textarea
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
              }}
              placeholder="Paste code… Ctrl+Enter to send"
              className="h-20 flex-1 resize-none rounded-lg border border-border bg-bg-primary px-3 py-2 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
            />
          ) : (
            <Input
              value={input}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Type a message… Enter to send"
              className="flex-1"
            />
          )}
          <Button type="submit" size="sm" disabled={!input.trim()}>
            Send
          </Button>
        </div>
      </form>
    </div>
  );
});
