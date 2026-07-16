import { prisma } from "../config/prisma.js";
import { generateRoomCode, pickCursorColor } from "../utils/helpers.js";

const roomInclude = {
  problem: true,
  creator: { select: { id: true, username: true } },
  host: { select: { id: true, username: true } },
  participants: {
    include: { user: { select: { id: true, username: true } } },
  },
} as const;

export class RoomService {
  async createRoom(problemId: string, creatorId: string, starterCode: string, name?: string) {
    let code = generateRoomCode();
    let attempts = 0;

    while (attempts < 10) {
      const existing = await prisma.room.findUnique({ where: { code } });
      if (!existing) break;
      code = generateRoomCode();
      attempts++;
    }

    return prisma.room.create({
      data: {
        code,
        name: name || "Coding Session",
        problemId,
        creatorId,
        hostId: creatorId,
        sharedCode: starterCode,
        language: "java",
        theme: "vs-dark",
        participants: {
          create: {
            userId: creatorId,
            cursorColor: pickCursorColor(0),
          },
        },
      },
      include: roomInclude,
    });
  }

  async joinRoom(roomIdOrCode: string, userId: string, opts?: { viaCode?: boolean }) {
    const isCodeLookup = /^[A-Z0-9]{6}$/i.test(roomIdOrCode.trim());
    const room = await prisma.room.findFirst({
      where: isCodeLookup
        ? { code: roomIdOrCode.toUpperCase() }
        : { id: roomIdOrCode },
      include: roomInclude,
    });

    if (!room) throw new Error("Room not found");

    const alreadyIn = room.participants.some((p) => p.userId === userId);

    if (room.isPrivate && !alreadyIn && !isCodeLookup && !opts?.viaCode) {
      throw new Error("This is a private room. Join using the invite link or room code.");
    }
    if (room.isLocked && room.hostId !== userId && !alreadyIn) {
      throw new Error("Room is locked");
    }

    const existing = room.participants.find((p) => p.userId === userId);
    if (!existing) {
      if (room.participants.length >= room.maxParticipants) {
        throw new Error("Room is full");
      }
      await prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          userId,
          cursorColor: pickCursorColor(room.participants.length),
        },
      });
    }

    return prisma.room.findUnique({
      where: { id: room.id },
      include: roomInclude,
    });
  }

  async getRoom(roomId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        ...roomInclude,
        messages: {
          orderBy: { createdAt: "asc" },
          take: 100,
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });
    if (!room) throw new Error("Room not found");
    return room;
  }

  async updateSharedCode(roomId: string, code: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { sharedCode: code },
    });
  }

  async updateLanguage(roomId: string, language: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { language },
    });
  }

  async updateTheme(roomId: string, theme: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { theme },
    });
  }

  async updateWhiteboard(roomId: string, whiteboardData: string) {
    return prisma.room.update({
      where: { id: roomId },
      data: { whiteboardData },
    });
  }

  async updateSettings(
    roomId: string,
    hostId: string,
    settings: {
      name?: string;
      maxParticipants?: number;
      isPrivate?: boolean;
    }
  ) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error("Room not found");
    if (room.hostId !== hostId) throw new Error("Only the host can update settings");

    return prisma.room.update({
      where: { id: roomId },
      data: {
        ...(settings.name !== undefined && { name: settings.name }),
        ...(settings.maxParticipants !== undefined && {
          maxParticipants: Math.min(50, Math.max(2, settings.maxParticipants)),
        }),
        ...(settings.isPrivate !== undefined && { isPrivate: settings.isPrivate }),
      },
      include: roomInclude,
    });
  }

  async setLocked(roomId: string, hostId: string, isLocked: boolean) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error("Room not found");
    if (room.hostId !== hostId) throw new Error("Only the host can lock/unlock the room");

    return prisma.room.update({
      where: { id: roomId },
      data: { isLocked },
      include: roomInclude,
    });
  }

  async transferHost(roomId: string, currentHostId: string, targetUserId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { participants: true },
    });
    if (!room) throw new Error("Room not found");
    if (room.hostId !== currentHostId) throw new Error("Only the host can transfer host");
    if (!room.participants.some((p) => p.userId === targetUserId)) {
      throw new Error("Target user is not in the room");
    }

    return prisma.room.update({
      where: { id: roomId },
      data: { hostId: targetUserId },
      include: roomInclude,
    });
  }

  async removeParticipant(roomId: string, hostId: string, targetUserId: string) {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) throw new Error("Room not found");
    if (room.hostId !== hostId) throw new Error("Only the host can remove participants");
    if (targetUserId === hostId) throw new Error("Host cannot remove themselves");

    await prisma.roomParticipant.deleteMany({
      where: { roomId, userId: targetUserId },
    });

    return prisma.room.findUnique({
      where: { id: roomId },
      include: roomInclude,
    });
  }

  async getRecentRoomForUser(userId: string) {
    const participant = await prisma.roomParticipant.findFirst({
      where: { userId },
      orderBy: { joinedAt: "desc" },
      include: {
        room: {
          include: {
            problem: { select: { id: true, title: true, slug: true } },
          },
        },
      },
    });
    return participant?.room ?? null;
  }
}

export const roomService = new RoomService();
