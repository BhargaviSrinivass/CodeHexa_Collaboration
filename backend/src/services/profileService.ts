import { prisma } from "../config/prisma.js";

const TOPIC_LIST = [
  "Arrays",
  "Strings",
  "Trees",
  "Graphs",
  "DP",
  "Backtracking",
  "Sliding Window",
  "Binary Search",
  "Greedy",
  "Heap",
  "Stack",
  "Queue",
  "HashMap",
];

const BADGE_DEFS = [
  { id: "first-problem", name: "First Problem", desc: "Solve your first problem", icon: "🎯", check: (p: Stats) => p.totalSolved >= 1 },
  { id: "50-problems", name: "50 Problems", desc: "Solve 50 problems", icon: "5️⃣0️⃣", check: (p: Stats) => p.totalSolved >= 50 },
  { id: "100-problems", name: "100 Problems", desc: "Solve 100 problems", icon: "💯", check: (p: Stats) => p.totalSolved >= 100 },
  { id: "200-problems", name: "200 Problems", desc: "Solve 200 problems", icon: "🏆", check: (p: Stats) => p.totalSolved >= 200 },
  { id: "7-day-streak", name: "7 Day Streak", desc: "Code 7 days in a row", icon: "🔥", check: (p: Stats) => p.weeklyStreak >= 7 || p.longestStreak >= 7 },
  { id: "30-day-streak", name: "30 Day Streak", desc: "Code 30 days in a row", icon: "⚡", check: (p: Stats) => p.longestStreak >= 30 },
  { id: "100-day-streak", name: "100 Day Streak", desc: "Legendary consistency", icon: "👑", check: (p: Stats) => p.longestStreak >= 100 },
  { id: "consistency", name: "Consistency", desc: "Be active 50+ days", icon: "📅", check: (p: Stats) => p.activeDays >= 50 },
  { id: "collaborator", name: "Excellent Collaborator", desc: "Collaboration score 50+", icon: "🤝", check: (p: Stats) => p.collaborationScore >= 50 },
  { id: "teacher", name: "Teacher", desc: "Help score 20+", icon: "📚", check: (p: Stats) => p.helpScore >= 20 },
  { id: "debugger", name: "Debugger", desc: "10+ successful submissions", icon: "🐛", check: (p: Stats) => p.successfulSubs >= 10 },
  { id: "ai-master", name: "AI Master", desc: "AI learning score 30+", icon: "✨", check: (p: Stats) => p.aiLearningScore >= 30 },
  { id: "night-owl", name: "Night Owl", desc: "Solve after midnight", icon: "🦉", check: (p: Stats) => p.nightOwl },
  { id: "early-bird", name: "Early Bird", desc: "Solve before 7 AM", icon: "🐦", check: (p: Stats) => p.earlyBird },
];

type Stats = {
  totalSolved: number;
  weeklyStreak: number;
  longestStreak: number;
  activeDays: number;
  collaborationScore: number;
  helpScore: number;
  successfulSubs: number;
  aiLearningScore: number;
  nightOwl: boolean;
  earlyBird: boolean;
};

export const profileService = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        college: true,
        github: true,
        linkedin: true,
        avatarUrl: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });
    if (!user) throw new Error("User not found");

    const progress = await prisma.progress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });

    const since365 = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const events = await prisma.activityEvent.findMany({
      where: { userId, createdAt: { gte: since365 } },
      orderBy: { createdAt: "asc" },
    });

    const heatmap: Record<string, { count: number; minutes: number }> = {};
    for (const e of events) {
      const day = e.createdAt.toISOString().slice(0, 10);
      if (!heatmap[day]) heatmap[day] = { count: 0, minutes: 0 };
      heatmap[day].count += e.value;
      if (e.kind === "session") {
        const meta = e.meta as { durationSec?: number } | null;
        heatmap[day].minutes += Math.round((meta?.durationSec || 0) / 60);
      } else {
        heatmap[day].minutes += e.value * 15;
      }
    }

    const activeDays = Object.keys(heatmap).length;
    const totalSolved = progress.solvedEasy + progress.solvedMedium + progress.solvedHard;
    const acceptanceRate =
      progress.totalSubmissions === 0
        ? 0
        : Math.round((progress.successfulSubs / progress.totalSubmissions) * 100);

    const aiCount = await prisma.aISession.count({ where: { userId } });

    const stats: Stats = {
      totalSolved,
      weeklyStreak: progress.weeklyStreak,
      longestStreak: progress.longestStreak || progress.weeklyStreak,
      activeDays,
      collaborationScore: progress.collaborationScore,
      helpScore: progress.helpScore,
      successfulSubs: progress.successfulSubs,
      aiLearningScore: progress.aiLearningScore || aiCount,
      nightOwl: events.some((e) => e.createdAt.getUTCHours() >= 22 || e.createdAt.getUTCHours() < 4),
      earlyBird: events.some((e) => e.createdAt.getUTCHours() >= 5 && e.createdAt.getUTCHours() < 7),
    };

    const badges = BADGE_DEFS.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.desc,
      icon: b.icon,
      unlocked: b.check(stats),
    }));

    const languageStats =
      (progress.languageStats as Record<string, number>) ||
      ({ java: totalSolved, python: 0, cpp: 0, javascript: 0 } as Record<string, number>);

    const topicStatsRaw = (progress.topicStats as Record<string, number>) || {};
    const topicProgress = TOPIC_LIST.map((t) => ({
      topic: t,
      solved: topicStatsRaw[t] || (progress.topicsMastered.includes(t.toLowerCase()) ? 1 : 0),
      total: 10,
    }));

    const friends = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true, lastActiveAt: true } },
        addressee: { select: { id: true, username: true, avatarUrl: true, lastActiveAt: true } },
      },
      take: 20,
    });

    const friendList = friends.map((f) => {
      const friend = f.requesterId === userId ? f.addressee : f.requester;
      return {
        ...friend,
        online: Date.now() - new Date(friend.lastActiveAt).getTime() < 5 * 60_000,
      };
    });

    const recentSessions = await prisma.collabSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
    });

    const allProgress = await prisma.progress.findMany({
      select: { userId: true, collaborationScore: true },
      orderBy: { collaborationScore: "desc" },
      take: 200,
    });
    const collabRank =
      allProgress.findIndex((p) => p.userId === userId) + 1 || allProgress.length + 1;

    return {
      user,
      stats: {
        solvedEasy: progress.solvedEasy,
        solvedMedium: progress.solvedMedium,
        solvedHard: progress.solvedHard,
        totalSolved,
        attempted: progress.attempted || totalSolved,
        acceptanceRate,
        totalSubmissions: progress.totalSubmissions,
        successfulSubs: progress.successfulSubs,
        currentStreak: progress.weeklyStreak,
        longestStreak: progress.longestStreak || progress.weeklyStreak,
        collaborationScore: progress.collaborationScore,
        aiLearningScore: progress.aiLearningScore || aiCount,
        collaborationHours: Math.round((progress.totalSessionSec || 0) / 3600),
        collaborationRank: collabRank,
        activeDays,
        favoriteLanguage: progress.favoriteLanguage,
        mostSolvedTopic:
          Object.entries(topicStatsRaw).sort((a, b) => b[1] - a[1])[0]?.[0] ||
          progress.topicsMastered[0] ||
          "Arrays",
      },
      heatmap,
      badges,
      languageStats,
      topicProgress,
      friends: friendList,
      recentSessions,
      contests: {
        upcoming: [
          { id: "1", name: "CodeHexa Weekly #12", startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), participants: 240 },
        ],
        completed: [
          { id: "2", name: "CodeHexa Weekly #11", rank: 42, rating: 1520, participated: true },
        ],
      },
    };
  },

  async updateProfile(
    userId: string,
    data: Partial<{
      displayName: string;
      bio: string;
      college: string;
      github: string;
      linkedin: string;
      avatarUrl: string;
    }>
  ) {
    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        bio: true,
        college: true,
        github: true,
        linkedin: true,
        avatarUrl: true,
        createdAt: true,
      },
    });
  },
};
