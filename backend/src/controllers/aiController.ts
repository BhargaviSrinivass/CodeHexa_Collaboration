import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthRequest } from "../middleware/auth.js";
import { aiService } from "../services/ai/index.js";

const hintSchema = z.object({
  problemTitle: z.string().min(1).max(200),
  description: z.string().max(8000),
  hintLevel: z.number().int().min(1).max(3).default(1),
  code: z.string().max(20000).optional(),
  language: z.string().max(40).optional(),
  roomId: z.string().optional(),
  problemId: z.string().optional(),
});

const reviewSchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().min(1).max(40),
  problemTitle: z.string().max(200).optional(),
  roomId: z.string().optional(),
});

const complexitySchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().min(1).max(40),
  roomId: z.string().optional(),
});

const edgeSchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().min(1).max(40),
  problemTitle: z.string().max(200).optional(),
  description: z.string().max(8000).optional(),
  roomId: z.string().optional(),
});

const debugSchema = z.object({
  code: z.string().min(1).max(20000),
  language: z.string().min(1).max(40),
  stderr: z.string().max(8000).optional(),
  stdout: z.string().max(8000).optional(),
  errorType: z.string().max(80).optional(),
  roomId: z.string().optional(),
});

const explainSchema = z.object({
  selection: z.string().min(1).max(8000),
  language: z.string().min(1).max(40),
  context: z.string().max(8000).optional(),
  roomId: z.string().optional(),
});

const chatSchema = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().optional(),
  roomId: z.string().optional(),
  history: z
    .array(z.object({ role: z.string(), content: z.string().max(4000) }))
    .max(20)
    .optional(),
});

const summarySchema = z.object({
  roomId: z.string().min(1),
  problemTitle: z.string().min(1).max(200),
  code: z.string().max(20000),
  chatHighlights: z.string().max(8000).optional(),
});

export async function hint(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = hintSchema.parse(req.body);
    const result = await aiService.hint({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function review(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = reviewSchema.parse(req.body);
    const result = await aiService.review({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function complexity(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = complexitySchema.parse(req.body);
    const result = await aiService.complexity({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function edgeCases(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = edgeSchema.parse(req.body);
    const result = await aiService.edgeCases({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function debug(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = debugSchema.parse(req.body);
    const result = await aiService.debug({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function explain(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = explainSchema.parse(req.body);
    const result = await aiService.explain({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function chat(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = chatSchema.parse(req.body);
    const result = await aiService.chat({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = summarySchema.parse(req.body);
    const result = await aiService.summarize({ ...data, userId: req.user!.userId });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const roomId = req.params.roomId as string;
    const summary = await aiService.getSummary(roomId, req.user!.userId);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
}

export async function getProgress(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const progress = await aiService.getOrCreateProgress(req.user!.userId);
    res.json(progress);
  } catch (err) {
    next(err);
  }
}

export async function recordSolve(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const schema = z.object({
      difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
      topics: z.array(z.string()).optional(),
    });
    const data = schema.parse(req.body);
    const progress = await aiService.recordSolve(
      req.user!.userId,
      data.difficulty,
      data.topics || []
    );
    res.json(progress);
  } catch (err) {
    next(err);
  }
}
