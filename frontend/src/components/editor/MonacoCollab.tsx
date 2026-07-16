import { useEffect, useRef, useCallback, memo } from "react";
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../contexts/AuthContext";
import { Participant, CursorPosition, Language, EditorTheme } from "../../types";
import { useThrottle, useDebounce } from "../../hooks/useThrottle";

interface MonacoCollabProps {
  roomId: string;
  code: string;
  onCodeChange: (code: string) => void;
  participants: Participant[];
  language: Language;
  theme: EditorTheme;
  readOnly?: boolean;
  onSelectionChange?: (text: string) => void;
  onExplainSelection?: (text: string) => void;
}

interface RemoteCursor {
  userId: string;
  username: string;
  color: string;
  position: CursorPosition;
}

const LANG_MAP: Record<Language, string> = {
  java: "java",
  python: "python",
  cpp: "cpp",
  javascript: "javascript",
};

export const MonacoCollab = memo(function MonacoCollab({
  roomId,
  code,
  onCodeChange,
  participants,
  language,
  theme,
  readOnly = false,
  onSelectionChange,
  onExplainSelection,
}: MonacoCollabProps) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const applyingRemote = useRef(false);
  const remoteCursors = useRef<Map<string, RemoteCursor>>(new Map());
  const decorRef = useRef<string[]>([]);
  const lastEmitted = useRef(code);

  const myColor =
    participants.find((p) => p.id === user?.id)?.cursorColor || "#3b82f6";

  const updateCursorDecorations = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const monaco = (window as unknown as { monaco?: typeof import("monaco-editor") }).monaco;
    const decos = Array.from(remoteCursors.current.values()).map((c) => {
      const line = c.position.lineNumber || 1;
      const col = c.position.column || 1;
      return {
        range: {
          startLineNumber: line,
          startColumn: col,
          endLineNumber: line,
          endColumn: col,
        },
        options: {
          className: `remote-cursor-caret remotecursor-${c.userId}`,
          hoverMessage: { value: c.username },
          stickiness: 1 as const,
          after: {
            content: ` ${c.username}`,
            inlineClassName: `remote-cursor-label remotecursor-label-${c.userId}`,
          },
        },
      };
    });
    decorRef.current = ed.deltaDecorations(decorRef.current, decos);
    let styleEl = document.getElementById("remote-cursor-styles");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "remote-cursor-styles";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = Array.from(remoteCursors.current.values())
      .map(
        (c) => `
.remotecursor-${c.userId} {
  border-left: 2px solid ${c.color};
  margin-left: -1px;
  transition: border-color 0.1s ease;
}
.remotecursor-label-${c.userId} {
  background: ${c.color};
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 3px;
  margin-left: 2px;
  transition: transform 0.08s linear, opacity 0.08s linear;
  white-space: nowrap;
}
`
      )
      .join("\n");
    void monaco;
  }, []);

  const emitCursor = useThrottle((position: CursorPosition) => {
    socket?.emit("cursor-update", { roomId, position, color: myColor });
  }, 40);

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    ed.onDidChangeCursorPosition((e) => {
      if (applyingRemote.current) return;
      emitCursor({ lineNumber: e.position.lineNumber, column: e.position.column });
    });
    ed.onDidChangeCursorSelection(() => {
      const model = ed.getModel();
      const sel = ed.getSelection();
      if (!model || !sel || !onSelectionChange) return;
      const text = model.getValueInRange(sel);
      onSelectionChange(text);
    });

    ed.addAction({
      id: "ai-explain-selection",
      label: "Explain Selection (AI Mentor)",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1.5,
      run: (editor) => {
        const model = editor.getModel();
        const sel = editor.getSelection();
        if (!model || !sel) return;
        const text = model.getValueInRange(sel);
        if (text.trim()) onExplainSelection?.(text);
      },
    });
    void monaco;
  };

  useEffect(() => {
    if (!socket) return;

    const onCodeChangeRemote = (data: { code: string; userId: string }) => {
      if (data.userId === user?.id) return;
      const ed = editorRef.current;
      if (!ed) {
        onCodeChange(data.code);
        return;
      }
      const model = ed.getModel();
      if (!model) return;
      if (model.getValue() === data.code) return;

      applyingRemote.current = true;
      const selections = ed.getSelections();
      const position = ed.getPosition();
      // Apply without destroying undo stack as much as possible
      ed.executeEdits("remote", [
        {
          range: model.getFullModelRange(),
          text: data.code,
          forceMoveMarkers: true,
        },
      ]);
      if (position) ed.setPosition(position);
      if (selections) ed.setSelections(selections);
      lastEmitted.current = data.code;
      onCodeChange(data.code);
      applyingRemote.current = false;
    };

    const onCursor = (data: {
      userId: string;
      username: string;
      position: CursorPosition;
      color: string;
    }) => {
      if (data.userId === user?.id) return;
      remoteCursors.current.set(data.userId, {
        userId: data.userId,
        username: data.username,
        color: data.color,
        position: data.position,
      });
      updateCursorDecorations();
    };

    socket.on("code-change", onCodeChangeRemote);
    socket.on("cursor-update", onCursor);
    socket.on("cursor-move", onCursor);

    return () => {
      socket.off("code-change", onCodeChangeRemote);
      socket.off("cursor-update", onCursor);
      socket.off("cursor-move", onCursor);
    };
  }, [socket, roomId, user?.id, onCodeChange, updateCursorDecorations, emitCursor]);

  // Keep editor in sync when local state changes from sync-state (not from typing)
  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (applyingRemote.current) return;
    if (ed.getValue() !== code && lastEmitted.current !== code) {
      applyingRemote.current = true;
      const pos = ed.getPosition();
      ed.setValue(code);
      if (pos) ed.setPosition(pos);
      lastEmitted.current = code;
      applyingRemote.current = false;
    }
  }, [code]);

  const emitCode = useDebounce((newCode: string) => {
    socket?.emit("code-change", { roomId, code: newCode });
  }, 80);

  const handleChange = (value: string | undefined) => {
    if (applyingRemote.current || readOnly) return;
    const newCode = value ?? "";
    lastEmitted.current = newCode;
    onCodeChange(newCode);
    emitCode(newCode);
  };

  return (
    <Editor
      height="100%"
      language={LANG_MAP[language]}
      theme={theme}
      value={code}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 16 },
        automaticLayout: true,
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        readOnly,
      }}
    />
  );
});
