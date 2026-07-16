import type { Server } from "socket.io";

const userSocketIds = new Map<string, Set<string>>();

export function trackUserSocket(userId: string, socketId: string) {
  if (!userSocketIds.has(userId)) userSocketIds.set(userId, new Set());
  userSocketIds.get(userId)!.add(socketId);
}

export function untrackUserSocket(userId: string, socketId: string) {
  const set = userSocketIds.get(userId);
  if (!set) return false;
  set.delete(socketId);
  if (set.size === 0) {
    userSocketIds.delete(userId);
    return true;
  }
  return false;
}

export function emitToUser(io: Server, userId: string, event: string, payload: unknown) {
  const ids = userSocketIds.get(userId);
  if (!ids) return;
  for (const sid of ids) {
    io.to(sid).emit(event, payload);
  }
}

export function isUserOnline(userId: string) {
  return userSocketIds.has(userId);
}
