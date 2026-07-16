import { prisma } from "../config/prisma.js";

export const analyticsService = {
  async getDashboard(userId: string) {
    const progress = await prisma.progress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const events = await prisma.activityEvent.findMany({
      where: { userId, createdAt: { gte: since30 } },
      orderBy: { createdAt: "asc" },
    });

    const weekly: Record<string, number> = {};
    const monthly: Record<string, number> = {};
    for (const e of events) {
      const day = e.createdAt.toISOString().slice(0, 10);
      monthly[day] = (monthly[day] || 0) + e.value;
      if (e.createdAt >= since7) weekly[day] = (weekly[day] || 0) + e.value;
    }

    const topicDist: Record<string, number> = {};
    for (const t of progress.topicsMastered) {
      topicDist[t] = (topicDist[t] || 0) + 1;
    }

    const sessions = await prisma.collabSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 20,
    });

    const avgSession =
      sessions.length === 0
        ? 0
        : Math.round(
            sessions.reduce((s, x) => s + x.durationSec, 0) / sessions.length
          );

    return {
      progress,
      weeklyActivity: weekly,
      monthlyActivity: monthly,
      topicDistribution: topicDist,
      difficultyDistribution: {
        easy: progress.solvedEasy,
        medium: progress.solvedMedium,
        hard: progress.solvedHard,
      },
      averageSessionDurationSec: avgSession,
      favoriteLanguage: progress.favoriteLanguage,
      mostSolvedTopics: Object.entries(topicDist)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({ topic, count })),
      timeline: events.slice(-50),
      recentSessions: sessions,
    };
  },

  async leaderboard(scope: "global" | "friends", userId: string, period: "weekly" | "monthly" | "overall") {
    let friendIds: string[] = [];
    if (scope === "friends") {
      const friends = await prisma.friendship.findMany({
        where: {
          status: "ACCEPTED",
          OR: [{ requesterId: userId }, { addresseeId: userId }],
        },
      });
      friendIds = friends.map((f) =>
        f.requesterId === userId ? f.addresseeId : f.requesterId
      );
      friendIds.push(userId);
    }

    const where =
      scope === "friends"
        ? { userId: { in: friendIds } }
        : undefined;

    const rows = await prisma.progress.findMany({
      where,
      include: { user: { select: { id: true, username: true } } },
      orderBy: [
        { solvedEasy: "desc" },
        { solvedMedium: "desc" },
        { collaborationScore: "desc" },
      ],
      take: 50,
    });

    // Period filter soft-weights: for weekly/monthly, boost recent solves
    const since =
      period === "weekly"
        ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        : period === "monthly"
          ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          : null;

    return rows.map((r, i) => {
      const total = r.solvedEasy + r.solvedMedium + r.solvedHard;
      const recentBonus =
        since && r.lastSolvedAt && r.lastSolvedAt >= since ? 5 : 0;
      const score =
        total * 10 +
        r.collaborationScore +
        r.helpScore +
        r.roomParticipation +
        recentBonus;
      return {
        rank: i + 1,
        userId: r.user.id,
        username: r.user.username,
        problemsSolved: total,
        collaborationScore: r.collaborationScore,
        helpScore: r.helpScore,
        roomParticipation: r.roomParticipation,
        streak: r.weeklyStreak,
        score,
      };
    }).sort((a, b) => b.score - a.score)
      .map((r, i) => ({ ...r, rank: i + 1 }));
  },

  async trackActivity(userId: string, kind: string, value = 1, meta?: object) {
    await prisma.activityEvent.create({
      data: { userId, kind, value, meta: meta as object | undefined },
    });
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    });
  },

  async endCollabSession(params: {
    userId: string;
    roomId: string;
    roomName: string;
    problemTitle?: string;
    participants: string[];
    durationSec: number;
    messagesCount: number;
    problemsSolved?: string[];
    summary?: string;
    language?: string;
  }) {
    const session = await prisma.collabSession.create({
      data: {
        userId: params.userId,
        roomId: params.roomId,
        roomName: params.roomName,
        problemTitle: params.problemTitle,
        participants: params.participants,
        durationSec: params.durationSec,
        messagesCount: params.messagesCount,
        problemsSolved: params.problemsSolved || [],
        summary: params.summary,
        language: params.language,
        endedAt: new Date(),
      },
    });
    await prisma.progress.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        roomParticipation: 1,
        totalSessionSec: params.durationSec,
        favoriteLanguage: params.language || "java",
      },
      update: {
        roomParticipation: { increment: 1 },
        totalSessionSec: { increment: params.durationSec },
        collaborationScore: { increment: 2 },
        ...(params.language ? { favoriteLanguage: params.language } : {}),
      },
    });
    await this.trackActivity(params.userId, "session", 1, { roomId: params.roomId });
    return session;
  },

  async listSessions(userId: string) {
    return prisma.collabSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 50,
    });
  },
};
