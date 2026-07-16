export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  description?: string;
  examples?: { input: string; output: string; explanation?: string }[];
  constraints?: string[];
  starterCode?: string;
}

export type Language = "java" | "python" | "cpp" | "javascript";
export type EditorTheme = "vs-dark" | "light" | "hc-black";

export interface Room {
  id: string;
  code: string;
  name?: string;
  problemId: string;
  sharedCode: string;
  language?: Language;
  theme?: EditorTheme;
  isLocked?: boolean;
  isPrivate?: boolean;
  maxParticipants?: number;
  hostId?: string;
  problem: Problem;
  creator: { id: string; username: string };
  host?: { id: string; username: string };
  participants: {
    id: string;
    userId: string;
    cursorColor: string;
    user: { id: string; username: string };
  }[];
  messages?: ChatMessage[];
}

export interface Participant {
  id: string;
  username: string;
  cursorColor: string;
  online: boolean;
  isHost?: boolean;
  speaking?: boolean;
  presence?: PresenceState;
}

export type PresenceState =
  | "online"
  | "idle"
  | "typing"
  | "speaking"
  | "whiteboard"
  | "editing-code"
  | "offline";

export interface UserSettings {
  id: string;
  userId: string;
  theme: "dark" | "light" | "system";
  editorFont: string;
  fontSize: number;
  preferredLanguage: string;
  notifyJoins: boolean;
  notifyMentions: boolean;
  notifyFriendRequests: boolean;
  privacyShowOnline: boolean;
  autoJoinVoice: boolean;
}

export interface FriendUser {
  friendshipId: string;
  id: string;
  username: string;
  online: boolean;
  lastActiveAt: string;
}

export interface PendingFriendRequest {
  id: string;
  requester: { id: string; username: string };
  createdAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  kind: "FAVORITE" | "REVISION" | "COLLECTION";
  problemId?: string | null;
  roomId?: string | null;
  collection?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface CollabSession {
  id: string;
  roomId: string;
  roomName: string;
  problemTitle?: string | null;
  participants: string[];
  durationSec: number;
  messagesCount: number;
  problemsSolved: string[];
  summary?: string | null;
  language?: string | null;
  startedAt: string;
  endedAt?: string | null;
}

export interface AnalyticsDashboard {
  progress: Progress & {
    collaborationScore?: number;
    helpScore?: number;
    roomParticipation?: number;
    favoriteLanguage?: string;
    totalSessionSec?: number;
  };
  weeklyActivity: Record<string, number>;
  monthlyActivity: Record<string, number>;
  topicDistribution: Record<string, number>;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  averageSessionDurationSec: number;
  favoriteLanguage: string;
  mostSolvedTopics: { topic: string; count: number }[];
  timeline: { id: string; kind: string; value: number; createdAt: string }[];
  recentSessions: CollabSession[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  problemsSolved: number;
  collaborationScore: number;
  helpScore: number;
  roomParticipation: number;
  streak: number;
  score: number;
}

export interface GlobalSearchResult {
  problems: { id: string; title: string; slug: string; difficulty: string }[];
  users: { id: string; username: string; lastActiveAt: string }[];
  rooms: { id: string; name: string; code: string; createdAt: string }[];
  messages: {
    id: string;
    content: string;
    user: { username: string };
    room: { id: string; name: string };
  }[];
  sessions: CollabSession[];
}

export interface ChatMessage {
  id: string;
  content: string;
  messageType?: "text" | "code" | "emoji";
  createdAt: string;
  user: { id: string; username: string };
}

export interface RunResult {
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryUsageKb?: number;
  results: {
    input: string;
    expectedOutput: string;
    actualOutput: string;
    passed: boolean;
  }[];
  allPassed: boolean;
}

export interface CursorPosition {
  lineNumber?: number;
  column?: number;
  x?: number;
  y?: number;
}

export type WhiteboardTool =
  | "pencil"
  | "eraser"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "text";

export interface WhiteboardStroke {
  id: string;
  tool: WhiteboardTool;
  color: string;
  size: number;
  points: { x: number; y: number }[];
  text?: string;
  userId?: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
}

export interface Progress {
  id: string;
  userId: string;
  solvedEasy: number;
  solvedMedium: number;
  solvedHard: number;
  topicsMastered: string[];
  weakTopics: string[];
  weeklyStreak: number;
  lastSolvedAt?: string | null;
}

export interface UserProfile {
  user: {
    id: string;
    username: string;
    email: string;
    displayName?: string | null;
    bio?: string | null;
    college?: string | null;
    github?: string | null;
    linkedin?: string | null;
    avatarUrl?: string | null;
    createdAt: string;
    lastActiveAt?: string;
  };
  stats: {
    solvedEasy: number;
    solvedMedium: number;
    solvedHard: number;
    totalSolved: number;
    attempted: number;
    acceptanceRate: number;
    totalSubmissions: number;
    successfulSubs: number;
    currentStreak: number;
    longestStreak: number;
    collaborationScore: number;
    aiLearningScore: number;
    collaborationHours: number;
    collaborationRank: number;
    activeDays: number;
    favoriteLanguage: string;
    mostSolvedTopic: string;
  };
  heatmap: Record<string, { count: number; minutes: number }>;
  badges: { id: string; name: string; description: string; icon: string; unlocked: boolean }[];
  languageStats: Record<string, number>;
  topicProgress: { topic: string; solved: number; total: number }[];
  friends: {
    id: string;
    username: string;
    avatarUrl?: string | null;
    online: boolean;
    lastActiveAt: string;
  }[];
  recentSessions: CollabSession[];
  contests: {
    upcoming: { id: string; name: string; startsAt: string; participants: number }[];
    completed: { id: string; name: string; rank: number; rating: number; participated: boolean }[];
  };
}
