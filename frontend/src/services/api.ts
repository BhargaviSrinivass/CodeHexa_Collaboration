const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return null;
    localStorage.setItem("token", data.token);
    if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
    return data.token as string;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res = await fetch(`${API_URL}${path}`, { ...options, headers });
  let data = await res.json().catch(() => ({}));

  if (res.status === 401 && localStorage.getItem("refreshToken")) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      res = await fetch(`${API_URL}${path}`, { ...options, headers });
      data = await res.json().catch(() => ({}));
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, data.error || "Request failed");
  }
  return data as T;
}

type AuthResponse = {
  token: string;
  refreshToken?: string;
  user: { id: string; username: string; email: string };
};

export const api = {
  register: (username: string, email: string, password: string) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),

  login: (email: string, password: string) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: localStorage.getItem("refreshToken") }),
    }),

  me: () => request<{ id: string; username: string; email: string }>("/api/auth/me"),

  getProblems: () => request<import("../types").Problem[]>("/api/problems"),

  getProblem: (id: string) => request<import("../types").Problem>(`/api/problems/${id}`),

  createRoom: (problemId: string, name?: string) =>
    request<import("../types").Room>("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ problemId, name }),
    }),

  joinRoom: (roomIdOrCode: string) =>
    request<import("../types").Room>("/api/rooms/join", {
      method: "POST",
      body: JSON.stringify({ roomIdOrCode }),
    }),

  getRoom: (id: string) => request<import("../types").Room>(`/api/rooms/${id}`),

  getRecentRoom: () => request<{ room: import("../types").Room | null }>("/api/rooms/recent"),

  runCode: (opts: {
    code: string;
    problemId?: string;
    language?: string;
    mode?: "tests" | "custom";
    stdin?: string;
  }) =>
    request<import("../types").RunResult>("/api/run", {
      method: "POST",
      body: JSON.stringify(opts),
    }),

  aiHint: (body: Record<string, unknown>) =>
    request<{ hint: string; level: number }>("/api/ai/hint", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiReview: (body: Record<string, unknown>) =>
    request<{ review: string; score: number | null }>("/api/ai/review", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiComplexity: (body: Record<string, unknown>) =>
    request<{ analysis: string }>("/api/ai/complexity", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiEdgeCases: (body: Record<string, unknown>) =>
    request<{ edgeCases: string }>("/api/ai/edge-cases", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiDebug: (body: Record<string, unknown>) =>
    request<{ debug: string }>("/api/ai/debug", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiExplain: (body: Record<string, unknown>) =>
    request<{ explanation: string }>("/api/ai/explain", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiChat: (body: Record<string, unknown>) =>
    request<{ reply: string; sessionId: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  aiSummary: (body: Record<string, unknown>) =>
    request<{ summary: unknown }>("/api/ai/summary", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  getAiSummary: (roomId: string) =>
    request<{ summary: unknown }>(`/api/ai/summary/${roomId}`),

  getProgress: () => request<import("../types").Progress>("/api/ai/progress"),

  recordSolve: (difficulty: string, topics?: string[]) =>
    request("/api/ai/progress/solve", {
      method: "POST",
      body: JSON.stringify({ difficulty, topics }),
    }),

  // Social
  searchUsers: (q: string) =>
    request<{ id: string; username: string; email: string; lastActiveAt: string }[]>(
      `/api/social/users/search?q=${encodeURIComponent(q)}`
    ),

  getFriends: () =>
    request<{
      friends: import("../types").FriendUser[];
      pending: import("../types").PendingFriendRequest[];
    }>("/api/social/friends"),

  sendFriendRequest: (userId: string) =>
    request("/api/social/friends/request", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }),

  respondFriendRequest: (friendshipId: string, accept: boolean) =>
    request("/api/social/friends/respond", {
      method: "POST",
      body: JSON.stringify({ friendshipId, accept }),
    }),

  removeFriend: (friendshipId: string) =>
    request(`/api/social/friends/${friendshipId}`, { method: "DELETE" }),

  getBookmarks: () => request<import("../types").Bookmark[]>("/api/social/bookmarks"),

  createBookmark: (data: {
    title: string;
    kind?: "FAVORITE" | "REVISION" | "COLLECTION";
    problemId?: string;
    roomId?: string;
    collection?: string;
    notes?: string;
  }) =>
    request<import("../types").Bookmark>("/api/social/bookmarks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  deleteBookmark: (id: string) =>
    request(`/api/social/bookmarks/${id}`, { method: "DELETE" }),

  getSettings: () => request<import("../types").UserSettings>("/api/social/settings"),

  updateSettings: (data: Partial<import("../types").UserSettings>) =>
    request<import("../types").UserSettings>("/api/social/settings", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getNotifications: () =>
    request<import("../types").AppNotification[]>("/api/social/notifications"),

  readNotifications: (id?: string) =>
    request("/api/social/notifications/read", {
      method: "POST",
      body: JSON.stringify(id ? { id } : {}),
    }),

  getAnalytics: () => request<import("../types").AnalyticsDashboard>("/api/social/analytics"),

  getProfile: (userId = "me") =>
    request<import("../types").UserProfile>(
      userId === "me" ? "/api/social/profile" : `/api/social/profile/${userId}`
    ),

  updateProfile: (data: {
    displayName?: string;
    bio?: string;
    college?: string;
    github?: string;
    linkedin?: string;
    avatarUrl?: string;
  }) =>
    request("/api/social/profile", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getLeaderboard: (
    scope: "global" | "friends" = "global",
    period: "weekly" | "monthly" | "overall" = "overall"
  ) =>
    request<import("../types").LeaderboardEntry[]>(
      `/api/social/leaderboard?scope=${scope}&period=${period}`
    ),

  getSessions: () => request<import("../types").CollabSession[]>("/api/social/sessions"),

  endSession: (data: {
    roomId: string;
    roomName: string;
    problemTitle?: string;
    participants: string[];
    durationSec: number;
    messagesCount: number;
    problemsSolved?: string[];
    summary?: string;
    language?: string;
  }) =>
    request<import("../types").CollabSession>("/api/social/sessions/end", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  globalSearch: (q: string) =>
    request<import("../types").GlobalSearchResult>(
      `/api/social/search?q=${encodeURIComponent(q)}`
    ),
};

export { ApiError };
