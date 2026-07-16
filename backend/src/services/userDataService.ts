import { prisma } from "../config/prisma.js";

export const bookmarkService = {
  async list(userId: string) {
    return prisma.bookmark.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async create(
    userId: string,
    data: {
      title: string;
      kind?: "FAVORITE" | "REVISION" | "COLLECTION";
      problemId?: string;
      roomId?: string;
      collection?: string;
      notes?: string;
    }
  ) {
    return prisma.bookmark.create({
      data: {
        userId,
        title: data.title,
        kind: data.kind || "FAVORITE",
        problemId: data.problemId,
        roomId: data.roomId,
        collection: data.collection,
        notes: data.notes,
      },
    });
  },

  async remove(userId: string, id: string) {
    const b = await prisma.bookmark.findUnique({ where: { id } });
    if (!b || b.userId !== userId) throw new Error("Bookmark not found");
    await prisma.bookmark.delete({ where: { id } });
    return { ok: true };
  },
};

export const settingsService = {
  async get(userId: string) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async update(
    userId: string,
    data: Partial<{
      theme: string;
      editorFont: string;
      fontSize: number;
      preferredLanguage: string;
      notifyJoins: boolean;
      notifyMentions: boolean;
      notifyFriendRequests: boolean;
      privacyShowOnline: boolean;
      autoJoinVoice: boolean;
    }>
  ) {
    return prisma.userSettings.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  },
};

export const notificationService = {
  async list(userId: string) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  },

  async markRead(userId: string, id?: string) {
    if (id) {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { read: true },
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId, read: false },
        data: { read: true },
      });
    }
    return { ok: true };
  },

  async create(userId: string, type: string, title: string, body: string, meta?: object) {
    return prisma.notification.create({
      data: { userId, type, title, body, meta: meta as object | undefined },
    });
  },
};

export const searchService = {
  async global(q: string, userId: string) {
    const term = q.trim();
    if (term.length < 2) return { problems: [], users: [], rooms: [], messages: [], sessions: [] };

    const [problems, users, rooms, messages, sessions] = await Promise.all([
      prisma.problem.findMany({
        where: {
          OR: [
            { title: { contains: term, mode: "insensitive" } },
            { slug: { contains: term, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, title: true, slug: true, difficulty: true },
      }),
      prisma.user.findMany({
        where: {
          username: { contains: term, mode: "insensitive" },
          id: { not: userId },
        },
        take: 10,
        select: { id: true, username: true, lastActiveAt: true },
      }),
      prisma.room.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { code: { contains: term.toUpperCase(), mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { id: true, name: true, code: true, createdAt: true },
      }),
      prisma.message.findMany({
        where: {
          content: { contains: term, mode: "insensitive" },
          room: { participants: { some: { userId } } },
        },
        take: 10,
        include: {
          user: { select: { username: true } },
          room: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.collabSession.findMany({
        where: {
          userId,
          OR: [
            { roomName: { contains: term, mode: "insensitive" } },
            { problemTitle: { contains: term, mode: "insensitive" } },
          ],
        },
        take: 10,
      }),
    ]);

    return { problems, users, rooms, messages, sessions };
  },
};
