import { Response, NextFunction } from "express";
import { z } from "zod";
import { problemService } from "../services/problemService.js";
import { runCode as executeCode, Language } from "../services/codeRunner.js";
import { AuthRequest } from "../middleware/auth.js";

const runSchema = z.object({
  code: z.string().min(1),
  problemId: z.string().optional(),
  language: z.enum(["java", "python", "cpp", "javascript"]).default("java"),
  mode: z.enum(["tests", "custom"]).default("tests"),
  stdin: z.string().optional(),
});

export async function runCode(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = runSchema.parse(req.body);
    const language = data.language as Language;

    if (data.mode === "custom") {
      const result = await executeCode(data.code, language, {
        mode: "custom",
        stdin: data.stdin || "",
      });
      return res.json(result);
    }

    if (!data.problemId) {
      return res.status(400).json({ error: "problemId required for test mode" });
    }

    const problem = await problemService.getProblemWithTestCases(data.problemId);
    const testCases = problem.testCases as { input: string; expectedOutput: string }[];

    const result = await executeCode(data.code, language, {
      mode: "tests",
      slug: problem.slug,
      testCases,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}
