import { Server, Socket } from "socket.io";
import { verifyToken, JwtPayload } from "../utils/jwt.js";
import { prisma } from "../config/prisma.js";
import { roomService } from "../services/roomService.js";
import { pickCursorColor } from "../utils/helpers.js";
import {
  getOrCreateRuntime,
  WhiteboardStroke,
} from "./events.js";
import { trackUserSocket, untrackUserSocket, emitToUser } from "./userSockets.js";

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

interface OnlineUser {
  id: string;
  username: string;
  cursorColor: string;
  online: boolean;
  isHost: boolean;
  speaking: boolean;
}

const roomOnlineUsers = new Map<string, Map<string, OnlineUser>>();
const socketRooms = new Map<string, Set<string>>(); // socketId -> roomIds
const roomVoiceUsers = new Map<string, Set<string>>(); // roomId -> userIds with mic on

function getParticipants(roomId: string, hostId?: string): OnlineUser[] {
  const users = roomOnlineUsers.get(roomId);
  if (!users) return [];
  return Array.from(users.values()).map((u) => ({
    ...u,
    isHost: hostId ? u.id === hostId : u.isHost,
  }));
}

async function emitToUserInRoom(
  io: Server,
  roomId: string,
  targetUserId: string,
  event: string,
  payload: unknown
) {
  const sockets = await io.in(roomId).fetchSockets();
  for (const s of sockets) {
    const auth = s as unknown as AuthenticatedSocket;
    if (auth.user?.userId === targetUserId) {
      s.emit(event, payload);
    }
  }
}

async function persistWhiteboard(roomId: string) {
  const runtime = getOrCreateRuntime(roomId);
  await roomService.updateWhiteboard(roomId, JSON.stringify(runtime.strokes));
}

function ensureOnlineMap(roomId: string) {
  if (!roomOnlineUsers.has(roomId)) roomOnlineUsers.set(roomId, new Map());
}

export function setupSocketHandlers(io: Server) {
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) return next(new Error("Authentication required"));
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", async (socket: AuthenticatedSocket) => {
    const userId = socket.user!.userId;
    const username = socket.user!.username;
    socketRooms.set(socket.id, new Set());
    trackUserSocket(userId, socket.id);

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });

    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });
    const friendIds = friendships.map((f) =>
      f.requesterId === userId ? f.addresseeId : f.requesterId
    );
    for (const fid of friendIds) {
      emitToUser(io, fid, "user-online", { userId, username });
    }
    for (const fid of friendIds) {
      const online = await prisma.user.findUnique({
        where: { id: fid },
        select: { id: true, username: true, lastActiveAt: true },
      });
      if (online) {
        socket.emit("user-online", { userId: fid, username: online.username });
      }
    }

    socket.on("join-room", async ({ roomId }: { roomId: string }) => {
      try {
        const room = await roomService.joinRoom(roomId, userId);
        if (!room) return;

        socket.join(room.id);
        socketRooms.get(socket.id)?.add(room.id);

        let participant = room.participants.find((p) => p.userId === userId);
        if (!participant) {
          const color = pickCursorColor(room.participants.length);
          participant = await prisma.roomParticipant.create({
            data: { roomId: room.id, userId, cursorColor: color },
            include: { user: { select: { id: true, username: true } } },
          });
        }

        ensureOnlineMap(room.id);
        roomOnlineUsers.get(room.id)!.set(userId, {
          id: userId,
          username,
          cursorColor: participant!.cursorColor,
          online: true,
          isHost: room.hostId === userId,
          speaking: false,
        });

        const runtime = getOrCreateRuntime(room.id);
        if (runtime.strokes.length === 0 && room.whiteboardData) {
          try {
            runtime.strokes = JSON.parse(room.whiteboardData) as WhiteboardStroke[];
          } catch {
            runtime.strokes = [];
          }
        }

        const participants = getParticipants(room.id, room.hostId);

        const messages = await prisma.message.findMany({
          where: { roomId: room.id },
          orderBy: { createdAt: "asc" },
          take: 100,
          include: { user: { select: { id: true, username: true } } },
        });

        const syncPayload = {
          roomId: room.id,
          code: room.sharedCode,
          language: room.language,
          theme: room.theme,
          name: room.name,
          isLocked: room.isLocked,
          isPrivate: room.isPrivate,
          maxParticipants: room.maxParticipants,
          hostId: room.hostId,
          roomCode: room.code,
          participants,
          problem: room.problem,
          whiteboardStrokes: runtime.strokes,
          messages,
          typingUsers: Array.from(runtime.typingUsers.values()),
        };

        socket.emit("sync-state", syncPayload);
        socket.emit("sync-code", {
          code: room.sharedCode,
          participants,
          roomId: room.id,
          problem: room.problem,
          language: room.language,
          theme: room.theme,
        });
        socket.emit("whiteboard-sync", { strokes: runtime.strokes });

        const joinedPayload = {
          user: {
            id: userId,
            username,
            cursorColor: participant!.cursorColor,
            online: true,
            isHost: room.hostId === userId,
            speaking: false,
          },
          participants,
        };
        socket.to(room.id).emit("participant-joined", joinedPayload);
        socket.to(room.id).emit("user-joined", joinedPayload);
        socket.to(room.id).emit("presence", {
          type: "joined",
          username,
          userId,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    const leaveRoom = async (roomId: string) => {
      socket.leave(roomId);
      socketRooms.get(socket.id)?.delete(roomId);
      const users = roomOnlineUsers.get(roomId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) roomOnlineUsers.delete(roomId);
      }
      if (roomVoiceUsers.get(roomId)?.delete(userId)) {
        socket.to(roomId).emit("voice-left", { userId });
      }
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      const participants = getParticipants(roomId, room?.hostId);
      io.to(roomId).emit("participant-left", { userId, username, participants });
      io.to(roomId).emit("user-left", { userId, participants });
      io.to(roomId).emit("presence", { type: "left", username, userId });
    };

    socket.on("leave-room", async ({ roomId }: { roomId: string }) => {
      await leaveRoom(roomId);
    });

    socket.on("code-change", async ({ roomId, code }: { roomId: string; code: string }) => {
      await roomService.updateSharedCode(roomId, code);
      socket.to(roomId).emit("code-change", { roomId, code, userId });
    });

    socket.on("language-change", async ({ roomId, language }: { roomId: string; language: string }) => {
      await roomService.updateLanguage(roomId, language);
      io.to(roomId).emit("language-change", { roomId, language, userId });
    });

    socket.on("theme-change", async ({ roomId, theme }: { roomId: string; theme: string }) => {
      await roomService.updateTheme(roomId, theme);
      io.to(roomId).emit("theme-change", { roomId, theme, userId });
    });

    const emitCursor = (payload: {
      roomId: string;
      position: { lineNumber?: number; column?: number; x?: number; y?: number };
      color: string;
    }) => {
      socket.to(payload.roomId).emit("cursor-update", {
        roomId: payload.roomId,
        userId,
        username,
        position: payload.position,
        color: payload.color,
      });
      socket.to(payload.roomId).emit("cursor-move", {
        roomId: payload.roomId,
        userId,
        username,
        position: payload.position,
        color: payload.color,
      });
    };

    socket.on("cursor-update", emitCursor);
    socket.on("cursor-move", emitCursor);

    // Full-screen pointer cursors (normalized %)
    socket.on(
      "pointer-move",
      ({
        roomId,
        x,
        y,
        color,
      }: {
        roomId: string;
        x: number;
        y: number;
        color: string;
      }) => {
        socket.to(roomId).emit("pointer-move", {
          roomId,
          userId,
          username,
          color,
          x,
          y,
        });
      }
    );

    // Voice / WebRTC signaling
    socket.on(
      "voice-state",
      ({
        roomId,
        speaking,
        micOn,
      }: {
        roomId: string;
        speaking: boolean;
        micOn: boolean;
      }) => {
        const users = roomOnlineUsers.get(roomId);
        const u = users?.get(userId);
        if (u) {
          u.speaking = !!speaking && !!micOn;
        }
        if (!roomVoiceUsers.has(roomId)) roomVoiceUsers.set(roomId, new Set());
        if (micOn) roomVoiceUsers.get(roomId)!.add(userId);
        else roomVoiceUsers.get(roomId)!.delete(userId);

        io.to(roomId).emit("voice-state", {
          userId,
          speaking: !!speaking && !!micOn,
          micOn: !!micOn,
          participants: getParticipants(roomId),
        });
      }
    );

    socket.on("voice-join", ({ roomId }: { roomId: string }) => {
      if (!roomVoiceUsers.has(roomId)) roomVoiceUsers.set(roomId, new Set());
      const peers = Array.from(roomVoiceUsers.get(roomId)!).filter((id) => id !== userId);
      roomVoiceUsers.get(roomId)!.add(userId);
      // Tell joiner who is already in voice so they can initiate offers
      socket.emit("voice-peers", { roomId, peers });
      // Notify others that this user joined voice
      socket.to(roomId).emit("voice-ready", { userId, username });
      io.to(roomId).emit("voice-joined", { userId, username });
      io.to(roomId).emit("notification", {
        type: "voice",
        message: `${username} joined voice`,
      });
    });

    socket.on("voice-leave", ({ roomId }: { roomId: string }) => {
      roomVoiceUsers.get(roomId)?.delete(userId);
      socket.to(roomId).emit("voice-left", { userId });
      io.to(roomId).emit("voice-left", { userId, username });
    });

    socket.on(
      "presence-update",
      ({
        roomId,
        presence,
      }: {
        roomId: string;
        presence: string;
      }) => {
        const users = roomOnlineUsers.get(roomId);
        const u = users?.get(userId);
        if (u) {
          (u as OnlineUser & { presence?: string }).presence = presence;
        }
        io.to(roomId).emit("presence-update", {
          userId,
          username,
          presence,
        });
      }
    );

    socket.on(
      "screen-share-start",
      ({ roomId }: { roomId: string }) => {
        io.to(roomId).emit("screen-share-start", {
          userId,
          username,
        });
        io.to(roomId).emit("notification", {
          type: "screen-share",
          message: `${username} started screen sharing`,
        });
      }
    );

    socket.on("screen-share-stop", ({ roomId }: { roomId: string }) => {
      io.to(roomId).emit("screen-share-stop", { userId, username });
      io.to(roomId).emit("notification", {
        type: "screen-share",
        message: `${username} stopped screen sharing`,
      });
    });

    socket.on(
      "webrtc-offer",
      async ({
        roomId,
        targetUserId,
        sdp,
        kind,
      }: {
        roomId: string;
        targetUserId: string;
        sdp: unknown;
        kind?: string;
      }) => {
        await emitToUserInRoom(io, roomId, targetUserId, "webrtc-offer", {
          fromUserId: userId,
          targetUserId,
          sdp,
          kind: kind || "voice",
        });
      }
    );

    socket.on(
      "webrtc-answer",
      async ({
        roomId,
        targetUserId,
        sdp,
        kind,
      }: {
        roomId: string;
        targetUserId: string;
        sdp: unknown;
        kind?: string;
      }) => {
        await emitToUserInRoom(io, roomId, targetUserId, "webrtc-answer", {
          fromUserId: userId,
          targetUserId,
          sdp,
          kind: kind || "voice",
        });
      }
    );

    socket.on(
      "webrtc-ice",
      async ({
        roomId,
        targetUserId,
        candidate,
        kind,
      }: {
        roomId: string;
        targetUserId: string;
        candidate: unknown;
        kind?: string;
      }) => {
        await emitToUserInRoom(io, roomId, targetUserId, "webrtc-ice", {
          fromUserId: userId,
          targetUserId,
          candidate,
          kind: kind || "voice",
        });
      }
    );

    // Room AI nudge (throttled client-side; host/backend can emit)
    socket.on(
      "room-ai-nudge",
      ({ roomId, message }: { roomId: string; message: string }) => {
        socket.to(roomId).emit("room-ai-nudge", { message, from: "ai" });
      }
    );

    socket.on(
      "chat-message",
      async ({
        roomId,
        content,
        messageType,
      }: {
        roomId: string;
        content: string;
        messageType?: string;
      }) => {
        const message = await prisma.message.create({
          data: {
            roomId,
            userId,
            content,
            messageType: messageType || "text",
          },
          include: { user: { select: { id: true, username: true } } },
        });

        io.to(roomId).emit("chat-message", {
          id: message.id,
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          user: message.user,
        });
      }
    );

    socket.on("typing-start", ({ roomId }: { roomId: string }) => {
      const runtime = getOrCreateRuntime(roomId);
      runtime.typingUsers.set(userId, username);
      socket.to(roomId).emit("typing-start", { userId, username });
    });

    socket.on("typing-stop", ({ roomId }: { roomId: string }) => {
      const runtime = getOrCreateRuntime(roomId);
      runtime.typingUsers.delete(userId);
      socket.to(roomId).emit("typing-stop", { userId, username });
    });

    // —— Whiteboard ——
    socket.on(
      "draw-start",
      ({ roomId, stroke }: { roomId: string; stroke: WhiteboardStroke }) => {
        const runtime = getOrCreateRuntime(roomId);
        if (!runtime.strokes.some((s) => s.id === stroke.id)) {
          runtime.strokes.push({ ...stroke, userId });
        }
        runtime.undone = [];
        socket.to(roomId).emit("draw-start", { stroke: { ...stroke, userId } });
      }
    );

    socket.on(
      "draw-update",
      ({
        roomId,
        strokeId,
        points,
      }: {
        roomId: string;
        strokeId: string;
        points: { x: number; y: number }[];
      }) => {
        const runtime = getOrCreateRuntime(roomId);
        const stroke = runtime.strokes.find((s) => s.id === strokeId);
        if (stroke) {
          stroke.points = points;
        }
        socket.to(roomId).emit("draw-update", { strokeId, points, userId });
      }
    );

    socket.on(
      "draw-end",
      async ({ roomId, stroke }: { roomId: string; stroke: WhiteboardStroke }) => {
        const runtime = getOrCreateRuntime(roomId);
        const idx = runtime.strokes.findIndex((s) => s.id === stroke.id);
        if (idx >= 0) {
          runtime.strokes[idx] = { ...stroke, userId };
        } else {
          runtime.strokes.push({ ...stroke, userId });
        }
        socket.to(roomId).emit("draw-end", { stroke: { ...stroke, userId } });
        await persistWhiteboard(roomId);
      }
    );

    socket.on("canvas-clear", async ({ roomId }: { roomId: string }) => {
      const runtime = getOrCreateRuntime(roomId);
      runtime.strokes = [];
      runtime.undone = [];
      io.to(roomId).emit("canvas-clear", { roomId, userId });
      await persistWhiteboard(roomId);
    });

    socket.on("undo", async ({ roomId }: { roomId: string }) => {
      const runtime = getOrCreateRuntime(roomId);
      const last = runtime.strokes.pop();
      if (last) {
        runtime.undone.push(last);
        io.to(roomId).emit("undo", { roomId, strokeId: last.id, strokes: runtime.strokes });
        await persistWhiteboard(roomId);
      }
    });

    socket.on("redo", async ({ roomId }: { roomId: string }) => {
      const runtime = getOrCreateRuntime(roomId);
      const stroke = runtime.undone.pop();
      if (stroke) {
        runtime.strokes.push(stroke);
        io.to(roomId).emit("redo", { roomId, stroke, strokes: runtime.strokes });
        await persistWhiteboard(roomId);
      }
    });

    // —— Room management ——
    socket.on(
      "room-settings-update",
      async ({
        roomId,
        settings,
      }: {
        roomId: string;
        settings: { name?: string; maxParticipants?: number; isPrivate?: boolean };
      }) => {
        try {
          const room = await roomService.updateSettings(roomId, userId, settings);
          io.to(roomId).emit("room-settings-update", {
            roomId,
            name: room.name,
            maxParticipants: room.maxParticipants,
            isPrivate: room.isPrivate,
          });
        } catch (err) {
          socket.emit("error", { message: (err as Error).message });
        }
      }
    );

    socket.on("room-lock", async ({ roomId }: { roomId: string }) => {
      try {
        await roomService.setLocked(roomId, userId, true);
        io.to(roomId).emit("room-locked", { roomId });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("room-unlock", async ({ roomId }: { roomId: string }) => {
      try {
        await roomService.setLocked(roomId, userId, false);
        io.to(roomId).emit("room-unlocked", { roomId });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on(
      "remove-participant",
      async ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
        try {
          await roomService.removeParticipant(roomId, userId, targetUserId);
          const room = await prisma.room.findUnique({ where: { id: roomId } });
          const users = roomOnlineUsers.get(roomId);
          const target = users?.get(targetUserId);
          users?.delete(targetUserId);
          const participants = getParticipants(roomId, room?.hostId);
          io.to(roomId).emit("participant-left", {
            userId: targetUserId,
            username: target?.username,
            participants,
            removed: true,
          });
          io.to(roomId).emit("presence", {
            type: "removed",
            username: target?.username,
            userId: targetUserId,
          });
          // Force disconnect target sockets from this room
          const sockets = await io.in(roomId).fetchSockets();
          for (const s of sockets) {
            const authSocket = s as unknown as AuthenticatedSocket;
            if (authSocket.user?.userId === targetUserId) {
              s.emit("kicked", { roomId });
              s.leave(roomId);
            }
          }
        } catch (err) {
          socket.emit("error", { message: (err as Error).message });
        }
      }
    );

    socket.on(
      "transfer-host",
      async ({ roomId, targetUserId }: { roomId: string; targetUserId: string }) => {
        try {
          const room = await roomService.transferHost(roomId, userId, targetUserId);
          const participants = getParticipants(roomId, room.hostId);
          // Update isHost flags
          const online = roomOnlineUsers.get(roomId);
          if (online) {
            for (const [id, u] of online) {
              u.isHost = id === room.hostId;
            }
          }
          io.to(roomId).emit("host-changed", {
            roomId,
            hostId: room.hostId,
            participants: getParticipants(roomId, room.hostId),
          });
          io.to(roomId).emit("participant-joined", {
            user: null,
            participants,
          });
        } catch (err) {
          socket.emit("error", { message: (err as Error).message });
        }
      }
    );

    socket.on("disconnect", async () => {
      const rooms = socketRooms.get(socket.id);
      if (rooms) {
        for (const roomId of rooms) {
          await leaveRoom(roomId);
        }
      }
      socketRooms.delete(socket.id);

      const wentOffline = untrackUserSocket(userId, socket.id);
      if (wentOffline) {
        const friendships = await prisma.friendship.findMany({
          where: {
            status: "ACCEPTED",
            OR: [{ requesterId: userId }, { addresseeId: userId }],
          },
        });
        for (const f of friendships) {
          const fid = f.requesterId === userId ? f.addresseeId : f.requesterId;
          emitToUser(io, fid, "user-offline", { userId, username });
        }
        await prisma.user.update({
          where: { id: userId },
          data: { lastActiveAt: new Date() },
        });
      }
    });
  });
}
