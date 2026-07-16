import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Socket } from "socket.io-client";
import { useToast } from "../components/ui/Toast";
import {
  Problem,
  Participant,
  ChatMessage,
  Language,
  EditorTheme,
  WhiteboardStroke,
} from "../types";

export interface SyncStatePayload {
  code: string;
  language?: Language;
  theme?: EditorTheme;
  name?: string;
  isLocked?: boolean;
  isPrivate?: boolean;
  maxParticipants?: number;
  hostId?: string;
  roomCode?: string;
  participants: Participant[];
  problem: Problem;
  whiteboardStrokes?: WhiteboardStroke[];
  messages?: ChatMessage[];
  typingUsers?: string[];
}

export interface RoomSocketCallbacks {
  onSyncState: (data: SyncStatePayload) => void;
  onParticipantsChange: (participants: Participant[]) => void;
  onMessage: (msg: ChatMessage) => void;
  onTypingStart: (username: string) => void;
  onTypingStop: (username: string) => void;
  onLanguageChange: (language: Language) => void;
  onThemeChange: (theme: EditorTheme) => void;
  onRoomLocked: () => void;
  onRoomUnlocked: () => void;
  onSettingsUpdate: (data: {
    name: string;
    maxParticipants: number;
    isPrivate: boolean;
  }) => void;
  onHostChanged: (hostId: string, participants: Participant[]) => void;
  onWhiteboardSync: (strokes: WhiteboardStroke[]) => void;
  onPresenceUpdate?: (userId: string, username: string, presence: string) => void;
  onScreenShareStart?: (userId: string, username: string) => void;
  onScreenShareStop?: (userId: string) => void;
  onNotification?: (message: string, type?: string) => void;
}

export function useRoomSocket(
  socket: Socket | null,
  connected: boolean,
  roomId: string,
  userId: string | undefined,
  callbacks: RoomSocketCallbacks
) {
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit("join-room", { roomId });

    const onSyncState = (data: SyncStatePayload) => {
      cbRef.current.onSyncState(data);
    };

    const onSyncCode = (data: {
      code: string;
      participants: Participant[];
      problem: Problem;
      language?: Language;
      theme?: EditorTheme;
    }) => {
      cbRef.current.onSyncState({
        code: data.code,
        participants: data.participants,
        problem: data.problem,
        language: data.language,
        theme: data.theme,
      });
    };

    const onParticipantJoined = (data: { participants: Participant[] }) => {
      cbRef.current.onParticipantsChange(data.participants);
    };

    const onParticipantLeft = (data: {
      userId: string;
      username?: string;
      participants: Participant[];
      removed?: boolean;
    }) => {
      cbRef.current.onParticipantsChange(data.participants);
      if (data.removed && data.userId === userId) {
        pushToast("You were removed from the room", "error");
        navigate("/dashboard");
      }
    };

    const onPresence = (data: { type: string; username?: string }) => {
      if (data.type === "joined" && data.username) {
        pushToast(`${data.username} joined`, "success");
      } else if (data.type === "left" && data.username) {
        pushToast(`${data.username} left`, "info");
      } else if (data.type === "removed" && data.username) {
        pushToast(`${data.username} was removed`, "warning");
      }
    };

    const onChatMessage = (msg: ChatMessage) => cbRef.current.onMessage(msg);

    const onTypingStart = (data: { username: string; userId: string }) => {
      if (data.userId !== userId) cbRef.current.onTypingStart(data.username);
    };

    const onTypingStop = (data: { username: string }) => {
      cbRef.current.onTypingStop(data.username);
    };

    const onKicked = () => {
      pushToast("You were removed from the room", "error");
      navigate("/dashboard");
    };

    const onError = (data: { message: string }) => pushToast(data.message, "error");

    socket.on("sync-state", onSyncState);
    socket.on("sync-code", onSyncCode);
    socket.on("participant-joined", onParticipantJoined);
    socket.on("participant-left", onParticipantLeft);
    socket.on("user-joined", onParticipantJoined);
    socket.on("user-left", onParticipantLeft);
    socket.on("presence", onPresence);
    socket.on("chat-message", onChatMessage);
    socket.on("typing-start", onTypingStart);
    socket.on("typing-stop", onTypingStop);
    socket.on("language-change", (d: { language: Language }) =>
      cbRef.current.onLanguageChange(d.language)
    );
    socket.on("theme-change", (d: { theme: EditorTheme }) =>
      cbRef.current.onThemeChange(d.theme)
    );
    socket.on("room-locked", () => {
      cbRef.current.onRoomLocked();
      pushToast("Room locked", "warning");
    });
    socket.on("room-unlocked", () => {
      cbRef.current.onRoomUnlocked();
      pushToast("Room unlocked", "success");
    });
    socket.on("room-settings-update", (d: {
      name: string;
      maxParticipants: number;
      isPrivate: boolean;
    }) => cbRef.current.onSettingsUpdate(d));
    socket.on("host-changed", (d: { hostId: string; participants: Participant[] }) => {
      cbRef.current.onHostChanged(d.hostId, d.participants);
      pushToast(
        d.hostId === userId ? "You are now the host" : "Host transferred",
        "info"
      );
    });
    socket.on("kicked", onKicked);
    socket.on("whiteboard-sync", (d: { strokes: WhiteboardStroke[] }) =>
      cbRef.current.onWhiteboardSync(d.strokes)
    );
    socket.on("presence-update", (d: { userId: string; username: string; presence: string }) => {
      cbRef.current.onPresenceUpdate?.(d.userId, d.username, d.presence);
    });
    socket.on("screen-share-start", (d: { userId: string; username: string }) => {
      cbRef.current.onScreenShareStart?.(d.userId, d.username);
      pushToast(`${d.username} started screen sharing`, "info");
    });
    socket.on("screen-share-stop", (d: { userId: string; username?: string }) => {
      cbRef.current.onScreenShareStop?.(d.userId);
      if (d.username) pushToast(`${d.username} stopped screen sharing`, "info");
    });
    socket.on("notification", (d: { message: string; type?: string }) => {
      cbRef.current.onNotification?.(d.message, d.type);
      pushToast(d.message, "info");
    });
    socket.on("error", onError);

    return () => {
      socket.emit("leave-room", { roomId });
      socket.off("sync-state", onSyncState);
      socket.off("sync-code", onSyncCode);
      socket.off("participant-joined", onParticipantJoined);
      socket.off("participant-left", onParticipantLeft);
      socket.off("user-joined", onParticipantJoined);
      socket.off("user-left", onParticipantLeft);
      socket.off("presence", onPresence);
      socket.off("chat-message", onChatMessage);
      socket.off("typing-start", onTypingStart);
      socket.off("typing-stop", onTypingStop);
      socket.off("language-change");
      socket.off("theme-change");
      socket.off("room-locked");
      socket.off("room-unlocked");
      socket.off("room-settings-update");
      socket.off("host-changed");
      socket.off("kicked", onKicked);
      socket.off("whiteboard-sync");
      socket.off("presence-update");
      socket.off("screen-share-start");
      socket.off("screen-share-stop");
      socket.off("notification");
      socket.off("error", onError);
    };
  }, [socket, connected, roomId, userId, pushToast, navigate]);
}
