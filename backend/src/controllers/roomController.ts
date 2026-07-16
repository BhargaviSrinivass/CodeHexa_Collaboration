import { Response, NextFunction } from "express";
import { z } from "zod";
import { roomService } from "../services/roomService.js";
import { problemService } from "../services/problemService.js";
import { AuthRequest } from "../middleware/auth.js";

const createRoomSchema = z.object({
  problemId: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
});

const joinRoomSchema = z.object({
  roomIdOrCode: z.string().min(1),
});

export async function createRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { problemId, name } = createRoomSchema.parse(req.body);
    const problem = await problemService.getProblemById(problemId);
    const room = await roomService.createRoom(
      problemId,
      req.user!.userId,
      problem.starterCode,
      name
    );
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
}

export async function joinRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { roomIdOrCode } = joinRoomSchema.parse(req.body);
    const room = await roomService.joinRoom(roomIdOrCode, req.user!.userId, {
      viaCode: /^[A-Z0-9]{6}$/i.test(roomIdOrCode.trim()),
    });
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function getRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const room = await roomService.getRoom(req.params.id as string);
    res.json(room);
  } catch (err) {
    next(err);
  }
}

export async function getRecentRoom(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const room = await roomService.getRecentRoomForUser(req.user!.userId);
    res.json({ room });
  } catch (err) {
    next(err);
  }
}
