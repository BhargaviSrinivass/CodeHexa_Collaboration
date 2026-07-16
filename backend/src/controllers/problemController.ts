import { Response, NextFunction } from "express";
import { problemService } from "../services/problemService.js";
import { AuthRequest } from "../middleware/auth.js";

export async function listProblems(_req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const problems = await problemService.listProblems();
    res.json(problems);
  } catch (err) {
    next(err);
  }
}

export async function getProblem(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const problem = await problemService.getProblemById(req.params.id as string);
    res.json(problem);
  } catch (err) {
    next(err);
  }
}
