import { Request, Response, NextFunction } from "express";

const hits = new Map<string, { count: number; resetAt: number }>();

/** Simple in-memory rate limit: max N requests per window per user/IP */
export function aiRateLimit(max = 30, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as Request & { user?: { userId: string } }).user?.userId;
    const key = userId || req.ip || "anon";
    const now = Date.now();
    let bucket = hits.get(key);
    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      hits.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({ error: "AI rate limit exceeded. Try again shortly." });
    }
    next();
  };
}
