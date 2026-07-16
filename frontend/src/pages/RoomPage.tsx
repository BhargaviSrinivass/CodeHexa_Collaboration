import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { useSocket } from "../contexts/SocketContext";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/ui/Toast";
import {
  Problem,
  Participant,
  ChatMessage,
  RunResult,
  Language,
  EditorTheme,
  WhiteboardStroke,
  PresenceState,
} from "../types";
import { MonacoCollab } from "../components/editor/MonacoCollab";
import { Participants } from "../components/room/Participants";
import { Chat } from "../components/room/Chat";
import { VoiceChatBar } from "../components/room/VoiceChatBar";
import { TestCasePanel } from "../components/room/TestCasePanel";
import { RoomSettings } from "../components/room/RoomSettings";
import { LiveCursorsOverlay } from "../components/room/LiveCursorsOverlay";
import { WhiteboardPanel, WhiteboardButton } from "../components/whiteboard/WhiteboardPanel";
import { AIPanel, AIPanelButton } from "../components/ai/AIPanel";
import { Button, DifficultyBadge } from "../components/ui";
import { useRoomSocket, SyncStatePayload } from "../hooks/useRoomSocket";
import { ScreenSharePanel } from "../components/room/ScreenSharePanel";
import { useTheme } from "../contexts/ThemeContext";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { PresenceBanner } from "../components/room/PresenceBanner";
import { RoomMobileTabs, RoomMobileTab } from "../components/room/RoomMobileTabs";

interface RoomPageProps {
  roomId: string;
}

export function RoomPage({ roomId }: RoomPageProps) {
  const navigate = useNavigate();
  const { socket, connected, reconnecting } = useSocket();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const roomContainerRef = useRef<HTMLDivElement>(null);
  const lastActivity = useRef(Date.now());

  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("Coding Session");
  const [hostId, setHostId] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(10);
  const [language, setLanguage] = useState<Language>("java");
  const [theme, setTheme] = useState<EditorTheme>("vs-dark");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [testTab, setTestTab] = useState<"input" | "output" | "console">("output");
  const [whiteboardOpen, setWhiteboardOpen] = useState(false);
  const [whiteboardStrokes, setWhiteboardStrokes] = useState<WhiteboardStroke[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [selection, setSelection] = useState("");
  const [leftWidth, setLeftWidth] = useState(32);
  const [testHeight, setTestHeight] = useState(220);
  const [screenSharerId, setScreenSharerId] = useState<string | null>(null);
  const [screenSharerName, setScreenSharerName] = useState("");
  const [mobileTab, setMobileTab] = useState<RoomMobileTab>("code");
  const [editingLines, setEditingLines] = useState<Record<string, number>>({});
  const sessionStartRef = useRef(Date.now());
  const solvedProblemsRef = useRef<string[]>([]);
  const { settings } = useTheme();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  // Tablet defaults to collapsed collaboration sidebar
  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true);
    if (isDesktop) setSidebarCollapsed(false);
  }, [isTablet, isDesktop]);

  useEffect(() => {
    if (mobileTab === "whiteboard") {
      setWhiteboardOpen(true);
    }
  }, [mobileTab]);

  const isHost = user?.id === hostId;
  const readOnly = isLocked && !isHost;
  const inviteLink = `${window.location.origin}/join?code=${roomCode}`;

  const applySyncState = useCallback((data: SyncStatePayload) => {
    setCode(data.code);
    if (data.language) setLanguage(data.language);
    if (data.theme) setTheme(data.theme);
    if (data.name) setRoomName(data.name);
    if (data.isLocked !== undefined) setIsLocked(data.isLocked);
    if (data.isPrivate !== undefined) setIsPrivate(data.isPrivate);
    if (data.maxParticipants) setMaxParticipants(data.maxParticipants);
    if (data.hostId) setHostId(data.hostId);
    if (data.roomCode) setRoomCode(data.roomCode);
    setParticipants(data.participants);
    setProblem(data.problem);
    if (data.whiteboardStrokes) setWhiteboardStrokes(data.whiteboardStrokes);
    if (data.messages) {
      setMessages(
        data.messages.map((m) => ({
          ...m,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : String(m.createdAt),
        }))
      );
    }
    if (data.typingUsers) setTypingUsers(data.typingUsers);
  }, []);

  const socketCallbacks = useMemo(
    () => ({
      onSyncState: applySyncState,
      onParticipantsChange: setParticipants,
      onMessage: (msg: ChatMessage) => setMessages((prev) => [...prev, msg]),
      onTypingStart: (username: string) =>
        setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username])),
      onTypingStop: (username: string) =>
        setTypingUsers((prev) => prev.filter((u) => u !== username)),
      onLanguageChange: setLanguage,
      onThemeChange: setTheme,
      onRoomLocked: () => setIsLocked(true),
      onRoomUnlocked: () => setIsLocked(false),
      onSettingsUpdate: (data: {
        name: string;
        maxParticipants: number;
        isPrivate: boolean;
      }) => {
        setRoomName(data.name);
        setMaxParticipants(data.maxParticipants);
        setIsPrivate(data.isPrivate);
      },
      onHostChanged: (newHostId: string, newParticipants: Participant[]) => {
        setHostId(newHostId);
        setParticipants(newParticipants);
      },
      onWhiteboardSync: setWhiteboardStrokes,
      onPresenceUpdate: (userId: string, _username: string, presence: string) => {
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === userId ? { ...p, presence: presence as PresenceState } : p
          )
        );
      },
      onScreenShareStart: (uid: string, uname: string) => {
        setScreenSharerId(uid);
        setScreenSharerName(uname);
      },
      onScreenShareStop: (uid: string) => {
        setScreenSharerId((cur) => (cur === uid ? null : cur));
        setScreenSharerName("");
      },
    }),
    [applySyncState]
  );

  useRoomSocket(socket, connected, roomId, user?.id, socketCallbacks);

  // Voice speaking status for participant panel
  useEffect(() => {
    if (!socket) return;
    const onVoice = (data: {
      userId: string;
      speaking: boolean;
      participants?: Participant[];
    }) => {
      if (data.participants) {
        setParticipants(data.participants);
        return;
      }
      setParticipants((prev) =>
        prev.map((p) => (p.id === data.userId ? { ...p, speaking: data.speaking } : p))
      );
    };
    const onNudge = (data: { message: string }) => {
      pushToast(data.message, "info");
      setAiOpen(true);
    };
    const onCursor = (data: {
      userId: string;
      username?: string;
      position?: { lineNumber?: number };
    }) => {
      if (data.userId === user?.id) return;
      const line = data.position?.lineNumber;
      if (!line) return;
      const key = data.username || data.userId;
      setEditingLines((prev) =>
        prev[key] === line ? prev : { ...prev, [key]: line, [data.userId]: line }
      );
    };
    socket.on("voice-state", onVoice);
    socket.on("room-ai-nudge", onNudge);
    socket.on("cursor-update", onCursor);
    socket.on("cursor-move", onCursor);
    return () => {
      socket.off("voice-state", onVoice);
      socket.off("room-ai-nudge", onNudge);
      socket.off("cursor-update", onCursor);
      socket.off("cursor-move", onCursor);
    };
  }, [socket, pushToast, user?.id]);

  // Presence: idle detection + activity states
  useEffect(() => {
    if (!socket) return;
    const idleTimer = setInterval(() => {
      const idleMin = (Date.now() - lastActivity.current) / 60000;
      if (idleMin >= 2) {
        socket.emit("presence-update", { roomId, presence: "idle" });
      }
    }, 30_000);
    return () => clearInterval(idleTimer);
  }, [socket, roomId]);

  useEffect(() => {
    if (!socket) return;
    if (whiteboardOpen) {
      socket.emit("presence-update", { roomId, presence: "whiteboard" });
    }
  }, [whiteboardOpen, socket, roomId]);

  // Gentle Room AI nudge if idle > 4 minutes (host only, max every 8 min)
  useEffect(() => {
    if (!isHost || !socket || !problem) return;
    const timer = setInterval(() => {
      const idleMin = (Date.now() - lastActivity.current) / 60000;
      if (idleMin >= 4) {
        socket.emit("room-ai-nudge", {
          roomId,
          message: `Stuck on ${problem.title}? Need a Hint? Need Example? Or Complexity Analysis?`,
        });
        pushToast("Need a Hint? Need Example? Would you like Complexity Analysis?", "info");
        lastActivity.current = Date.now();
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [isHost, socket, roomId, problem, pushToast]);

  useEffect(() => {
    api
      .getRoom(roomId)
      .then((room) => {
        setRoomCode(room.code);
        setRoomName(room.name || "Coding Session");
        setHostId(room.hostId || room.creator.id);
        setIsLocked(!!room.isLocked);
        setIsPrivate(!!room.isPrivate);
        setMaxParticipants(room.maxParticipants || 10);
        if (room.language) setLanguage(room.language);
        if (room.theme) setTheme(room.theme);
        if (!problem) setProblem(room.problem);
        if (!code) setCode(room.sharedCode);
      })
      .catch(() => {});
  }, [roomId]);

  const handleCodeChange = useCallback((newCode: string) => {
    lastActivity.current = Date.now();
    setCode(newCode);
    socket?.emit("presence-update", { roomId, presence: "editing-code" });
  }, [socket, roomId]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    socket?.emit("language-change", { roomId, language: lang });
  };

  const handleThemeChange = (t: EditorTheme) => {
    setTheme(t);
    socket?.emit("theme-change", { roomId, theme: t });
  };

  const run = async (mode: "tests" | "custom") => {
    if (!problem && mode === "tests") return;
    setRunning(true);
    setTestTab(mode === "custom" ? "console" : "output");
    try {
      const result = await api.runCode({
        code,
        problemId: problem?.id,
        language,
        mode,
        stdin: customInput,
      });
      setRunResult(result);
      if (mode === "tests") {
        setTestTab("output");
      }
      if (mode === "tests" && result.allPassed && problem) {
        await api.recordSolve(problem.difficulty, ["arrays"]).catch(() => {});
        if (!solvedProblemsRef.current.includes(problem.title)) {
          solvedProblemsRef.current.push(problem.title);
        }
        pushToast("All tests passed — Accepted!", "success");
      }
      if (mode === "tests" && !result.allPassed && result.stderr) {
        pushToast("Tests failed — open AI Debug for help", "warning");
      }
    } catch (err) {
      setRunResult({
        stdout: "",
        stderr: (err as Error).message,
        executionTimeMs: 0,
        results: [],
        allPassed: false,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleTypingStart = useCallback(() => {
    socket?.emit("typing-start", { roomId });
  }, [socket, roomId]);

  const emitTypingStop = useCallback(() => {
    socket?.emit("typing-stop", { roomId });
  }, [socket, roomId]);

  const handleSendChat = (content: string, messageType?: string) => {
    lastActivity.current = Date.now();
    socket?.emit("chat-message", { roomId, content, messageType });
  };

  const handleLeave = async () => {
    const durationSec = Math.round((Date.now() - sessionStartRef.current) / 1000);
    let summaryText = "";
    try {
      if (problem) {
        const summaryRes = await api.aiSummary({
          roomId,
          problemTitle: problem.title,
          code,
          chatHighlights: messages
            .slice(-10)
            .map((m) => `${m.user.username}: ${m.content}`)
            .join("\n"),
        });
        summaryText =
          typeof summaryRes.summary === "string"
            ? summaryRes.summary
            : JSON.stringify(summaryRes.summary);
      }
    } catch {
      /* ignore */
    }
    try {
      await api.endSession({
        roomId,
        roomName,
        problemTitle: problem?.title,
        participants: participants.map((p) => p.username),
        durationSec,
        messagesCount: messages.length,
        problemsSolved: solvedProblemsRef.current,
        summary: summaryText || undefined,
        language,
      });
    } catch {
      /* ignore */
    }
    socket?.emit("leave-room", { roomId });
    socket?.emit("voice-leave", { roomId });
    navigate("/dashboard");
  };

  const formatDescription = (text: string) =>
    text.split("`").map((part, i) =>
      i % 2 === 1 ? (
        <code key={i} className="rounded bg-bg-tertiary px-1.5 py-0.5 text-sm text-accent">
          {part}
        </code>
      ) : (
        <span key={i}>{part}</span>
      )
    );

  const startResizeLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const pct = (ev.clientX / window.innerWidth) * 100;
      setLeftWidth(Math.min(50, Math.max(18, pct)));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startResizeTest = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = testHeight;
    const onMove = (ev: MouseEvent) => {
      setTestHeight(Math.min(420, Math.max(140, startH + (startY - ev.clientY))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  if (!problem) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div ref={roomContainerRef} className="relative flex h-[100dvh] flex-col overflow-hidden">
      <LiveCursorsOverlay
        roomId={roomId}
        socket={socket}
        containerRef={roomContainerRef}
        participants={participants}
        enabled={!isMobile}
      />

      {(reconnecting || !connected) && (
        <div className="bg-warning/20 px-4 py-1 text-center text-xs text-warning">
          {reconnecting ? "Reconnecting… recovering room state" : "Disconnected"}
        </div>
      )}

      <header className="flex items-center justify-between gap-2 border-b border-border bg-bg-secondary px-2 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            className="hidden rounded px-2 text-text-secondary hover:bg-bg-tertiary md:inline"
            onClick={() => setSidebarCollapsed((v) => !v)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold sm:text-base">{roomName}</h1>
            <div className="flex items-center gap-2 text-[10px] text-text-secondary sm:text-xs">
              <span className="truncate">{problem.title}</span>
              <DifficultyBadge difficulty={problem.difficulty} />
              {isLocked && <span>🔒</span>}
            </div>
          </div>
          <span className="hidden rounded bg-bg-tertiary px-2 py-0.5 font-mono text-xs sm:inline">
            {roomCode}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
            disabled={readOnly}
            className="max-w-[5.5rem] rounded border border-border bg-bg-primary px-1 py-1 text-[10px] disabled:opacity-50 sm:max-w-none sm:px-2 sm:text-xs"
          >
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="javascript">JS</option>
          </select>
          <select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value as EditorTheme)}
            className="hidden rounded border border-border bg-bg-primary px-2 py-1 text-xs sm:block"
          >
            <option value="vs-dark">Dark</option>
            <option value="light">Light</option>
            <option value="hc-black">HC</option>
          </select>
          <Button size="sm" variant="secondary" className="!px-2" onClick={() => setAiOpen((v) => !v)}>
            AI
          </Button>
          <span className={`hidden text-xs sm:inline ${connected ? "text-success" : "text-error"}`}>
            {connected ? "● Live" : "○ Offline"}
          </span>
          <Button size="sm" variant="secondary" className="!px-2" onClick={() => setSettingsOpen(true)}>
            Invite
          </Button>
        </div>
      </header>

      {(isMobile || isTablet) && (
        <PresenceBanner
          participants={participants}
          typingUsers={typingUsers}
          currentUserId={user?.id}
          editingLines={editingLines}
        />
      )}

      {/* ===== Desktop / tablet three-column ===== */}
      <div className={`min-h-0 flex-1 overflow-hidden ${isMobile ? "hidden" : "flex"}`}>
        <div
          style={{ width: `${leftWidth}%` }}
          className="overflow-y-auto border-r border-border p-3 sm:p-4"
        >
          <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {formatDescription(problem.description || "")}
          </div>
          {problem.examples?.map((ex, i) => (
            <div key={i} className="mb-3 rounded-lg border border-border bg-bg-secondary p-3 text-sm">
              <p className="mb-1 font-medium">Example {i + 1}:</p>
              <div className="text-text-secondary">Input: {ex.input}</div>
              <div className="text-text-secondary">Output: {ex.output}</div>
            </div>
          ))}
        </div>

        <div
          onMouseDown={startResizeLeft}
          className="w-1 cursor-col-resize bg-border hover:bg-accent"
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1">
            {readOnly && (
              <div className="bg-warning/10 px-3 py-1 text-center text-xs text-warning">
                Room is locked — editing disabled
              </div>
            )}
            <MonacoCollab
              roomId={roomId}
              code={code}
              onCodeChange={handleCodeChange}
              participants={participants}
              language={language}
              theme={theme}
              readOnly={readOnly}
              onSelectionChange={setSelection}
              onExplainSelection={(text) => {
                setSelection(text);
                setAiOpen(true);
                pushToast("Open Tools → Explain Selection", "info");
              }}
            />
          </div>
          <div
            onMouseDown={startResizeTest}
            className="h-1 cursor-row-resize bg-border hover:bg-accent"
          />
          <div style={{ height: isTablet ? Math.min(testHeight, 200) : testHeight }}>
            <TestCasePanel
              customInput={customInput}
              onCustomInputChange={setCustomInput}
              runResult={runResult}
              running={running}
              onRunTests={() => run("tests")}
              onRunCustom={() => run("custom")}
              activeTab={testTab}
              onTabChange={setTestTab}
            />
          </div>
        </div>

        {!sidebarCollapsed && (
          <aside className="flex w-56 shrink-0 flex-col border-l border-border bg-bg-secondary xl:w-64">
            <Participants
              participants={participants}
              hostId={hostId}
              currentUserId={user?.id}
              isHost={isHost}
              onRemove={(id) => socket?.emit("remove-participant", { roomId, targetUserId: id })}
              onTransferHost={(id) => socket?.emit("transfer-host", { roomId, targetUserId: id })}
            />
            <ScreenSharePanel
              roomId={roomId}
              socket={socket}
              userId={user?.id}
              sharerId={screenSharerId}
              sharerName={screenSharerName}
            />
            <Chat
              messages={messages}
              onSend={handleSendChat}
              onTypingStart={handleTypingStart}
              onTypingStop={emitTypingStop}
              typingUsers={typingUsers}
            />
          </aside>
        )}

        {aiOpen && (
          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            roomId={roomId}
            problemTitle={problem.title}
            problemDescription={problem.description || ""}
            problemId={problem.id}
            difficulty={problem.difficulty}
            code={code}
            language={language}
            selection={selection}
            lastRunError={{ stderr: runResult?.stderr, stdout: runResult?.stdout }}
          />
        )}
      </div>

      {/* ===== Mobile tab panes ===== */}
      {isMobile && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {mobileTab === "problem" && (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
                {formatDescription(problem.description || "")}
              </div>
              {problem.examples?.map((ex, i) => (
                <div key={i} className="mb-3 rounded-xl border border-border bg-bg-secondary p-3 text-sm">
                  <p className="mb-1 font-medium">Example {i + 1}:</p>
                  <div className="text-text-secondary">Input: {ex.input}</div>
                  <div className="text-text-secondary">Output: {ex.output}</div>
                </div>
              ))}
            </div>
          )}

          {mobileTab === "code" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1">
                <MonacoCollab
                  roomId={roomId}
                  code={code}
                  onCodeChange={handleCodeChange}
                  participants={participants}
                  language={language}
                  theme={theme}
                  readOnly={readOnly}
                  onSelectionChange={setSelection}
                  onExplainSelection={(text) => {
                    setSelection(text);
                    setAiOpen(true);
                  }}
                />
              </div>
              <div className="h-[38%] min-h-[140px] border-t border-border">
                <TestCasePanel
                  customInput={customInput}
                  onCustomInputChange={setCustomInput}
                  runResult={runResult}
                  running={running}
                  onRunTests={() => run("tests")}
                  onRunCustom={() => run("custom")}
                  activeTab={testTab}
                  onTabChange={setTestTab}
                />
              </div>
            </div>
          )}

          {mobileTab === "chat" && (
            <div className="flex min-h-0 flex-1 flex-col">
              <Chat
                messages={messages}
                onSend={handleSendChat}
                onTypingStart={handleTypingStart}
                onTypingStop={emitTypingStop}
                typingUsers={typingUsers}
              />
            </div>
          )}

          {mobileTab === "whiteboard" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-text-secondary">Open the full-screen whiteboard</p>
              <Button onClick={() => setWhiteboardOpen(true)}>Open Whiteboard</Button>
            </div>
          )}

          {mobileTab === "room" && (
            <div className="flex-1 overflow-y-auto">
              <Participants
                participants={participants}
                hostId={hostId}
                currentUserId={user?.id}
                isHost={isHost}
                onRemove={(id) => socket?.emit("remove-participant", { roomId, targetUserId: id })}
                onTransferHost={(id) => socket?.emit("transfer-host", { roomId, targetUserId: id })}
              />
              <ScreenSharePanel
                roomId={roomId}
                socket={socket}
                userId={user?.id}
                sharerId={screenSharerId}
                sharerName={screenSharerName}
              />
              <div className="p-4">
                <Button className="w-full" variant="secondary" onClick={() => setSettingsOpen(true)}>
                  Invite / Room settings
                </Button>
                <Button className="mt-2 w-full" onClick={() => setAiOpen(true)}>
                  Open AI Assistant
                </Button>
              </div>
            </div>
          )}

          {aiOpen && (
            <AIPanel
              open={aiOpen}
              onClose={() => setAiOpen(false)}
              roomId={roomId}
              problemTitle={problem.title}
              problemDescription={problem.description || ""}
              problemId={problem.id}
              difficulty={problem.difficulty}
              code={code}
              language={language}
              selection={selection}
              lastRunError={{ stderr: runResult?.stderr, stdout: runResult?.stdout }}
            />
          )}
        </div>
      )}

      {/* Desktop / tablet voice bar */}
      {!isMobile && (
        <VoiceChatBar
          roomId={roomId}
          socket={socket}
          userId={user?.id}
          autoJoin={settings?.autoJoinVoice}
          onLeave={handleLeave}
          onOpenSettings={() => setSettingsOpen(true)}
          isLocked={isLocked}
        />
      )}

      {/* Mobile floating voice */}
      {isMobile && (
        <VoiceChatBar
          roomId={roomId}
          socket={socket}
          userId={user?.id}
          autoJoin={settings?.autoJoinVoice}
          onLeave={handleLeave}
          onOpenSettings={() => setSettingsOpen(true)}
          isLocked={isLocked}
          floating
        />
      )}

      {!isMobile && <AIPanelButton onClick={() => setAiOpen(true)} />}
      {!isMobile && <WhiteboardButton onClick={() => setWhiteboardOpen(true)} />}

      {isMobile && (
        <RoomMobileTabs
          active={mobileTab}
          onChange={(tab) => {
            setMobileTab(tab);
            if (tab === "whiteboard") setWhiteboardOpen(true);
          }}
        />
      )}

      <WhiteboardPanel
        open={whiteboardOpen}
        onClose={() => {
          setWhiteboardOpen(false);
          if (isMobile && mobileTab === "whiteboard") setMobileTab("code");
        }}
        roomId={roomId}
        socket={socket}
        initialStrokes={whiteboardStrokes}
      />

      <RoomSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isHost={isHost}
        name={roomName}
        maxParticipants={maxParticipants}
        isPrivate={isPrivate}
        isLocked={isLocked}
        roomCode={roomCode}
        inviteLink={inviteLink}
        onSave={(s) => socket?.emit("room-settings-update", { roomId, settings: s })}
        onLock={() => socket?.emit("room-lock", { roomId })}
        onUnlock={() => socket?.emit("room-unlock", { roomId })}
      />
    </div>
  );
}
