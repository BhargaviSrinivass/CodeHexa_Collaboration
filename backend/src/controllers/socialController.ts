import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { socialService } from "../services/socialService.js";
import {
  bookmarkService,
  settingsService,
  notificationService,
  searchService,
} from "../services/userDataService.js";
import { analyticsService } from "../services/analyticsService.js";
import { profileService } from "../services/profileService.js";

export async function searchUsers(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || "");
    res.json(await socialService.searchUsers(q, req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function sendFriend(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { userId } = z.object({ userId: z.string() }).parse(req.body);
    res.status(201).json(await socialService.sendFriendRequest(req.user!.userId, userId));
  } catch (e) {
    next(e);
  }
}

export async function respondFriend(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { friendshipId, accept } = z
      .object({ friendshipId: z.string(), accept: z.boolean() })
      .parse(req.body);
    res.json(await socialService.respondFriend(req.user!.userId, friendshipId, accept));
  } catch (e) {
    next(e);
  }
}

export async function listFriends(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json({
      friends: await socialService.listFriends(req.user!.userId),
      pending: await socialService.listPending(req.user!.userId),
    });
  } catch (e) {
    next(e);
  }
}

export async function removeFriend(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await socialService.removeFriend(req.user!.userId, req.params.id as string));
  } catch (e) {
    next(e);
  }
}

export async function listBookmarks(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await bookmarkService.list(req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function createBookmark(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = z
      .object({
        title: z.string().min(1).max(120),
        kind: z.enum(["FAVORITE", "REVISION", "COLLECTION"]).optional(),
        problemId: z.string().optional(),
        roomId: z.string().optional(),
        collection: z.string().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);
    res.status(201).json(await bookmarkService.create(req.user!.userId, data));
  } catch (e) {
    next(e);
  }
}

export async function deleteBookmark(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await bookmarkService.remove(req.user!.userId, req.params.id as string));
  } catch (e) {
    next(e);
  }
}

export async function getSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await settingsService.get(req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function updateSettings(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = z
      .object({
        theme: z.enum(["dark", "light", "system"]).optional(),
        editorFont: z.string().max(60).optional(),
        fontSize: z.number().int().min(10).max(28).optional(),
        preferredLanguage: z.string().max(40).optional(),
        notifyJoins: z.boolean().optional(),
        notifyMentions: z.boolean().optional(),
        notifyFriendRequests: z.boolean().optional(),
        privacyShowOnline: z.boolean().optional(),
        autoJoinVoice: z.boolean().optional(),
      })
      .parse(req.body);
    res.json(await settingsService.update(req.user!.userId, data));
  } catch (e) {
    next(e);
  }
}

export async function listNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await notificationService.list(req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function readNotifications(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = req.body?.id as string | undefined;
    res.json(await notificationService.markRead(req.user!.userId, id));
  } catch (e) {
    next(e);
  }
}

export async function analytics(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await analyticsService.getDashboard(req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function leaderboard(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const scope = (req.query.scope as "global" | "friends") || "global";
    const period = (req.query.period as "weekly" | "monthly" | "overall") || "overall";
    res.json(await analyticsService.leaderboard(scope, req.user!.userId, period));
  } catch (e) {
    next(e);
  }
}

export async function sessions(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    res.json(await analyticsService.listSessions(req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function endSession(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = z
      .object({
        roomId: z.string(),
        roomName: z.string(),
        problemTitle: z.string().optional(),
        participants: z.array(z.string()),
        durationSec: z.number().int().min(0),
        messagesCount: z.number().int().min(0),
        problemsSolved: z.array(z.string()).optional(),
        summary: z.string().optional(),
        language: z.string().optional(),
      })
      .parse(req.body);
    res.status(201).json(
      await analyticsService.endCollabSession({ ...data, userId: req.user!.userId })
    );
  } catch (e) {
    next(e);
  }
}

export async function search(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const q = String(req.query.q || "");
    res.json(await searchService.global(q, req.user!.userId));
  } catch (e) {
    next(e);
  }
}

export async function getProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = (req.params.userId as string) || req.user!.userId;
    res.json(await profileService.getProfile(id === "me" ? req.user!.userId : id));
  } catch (e) {
    next(e);
  }
}

export async function updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = z
      .object({
        displayName: z.string().max(80).optional(),
        bio: z.string().max(500).optional(),
        college: z.string().max(120).optional(),
        github: z.string().max(120).optional(),
        linkedin: z.string().max(200).optional(),
        avatarUrl: z.string().url().optional().or(z.literal("")),
      })
      .parse(req.body);
    res.json(await profileService.updateProfile(req.user!.userId, data));
  } catch (e) {
    next(e);
  }
}
