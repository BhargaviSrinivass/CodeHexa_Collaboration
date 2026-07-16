import { prisma } from "../config/prisma.js";

export class ProblemService {
  async listProblems() {
    return prisma.problem.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
      },
      orderBy: { title: "asc" },
    });
  }

  async getProblemById(id: string) {
    const problem = await prisma.problem.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        description: true,
        examples: true,
        constraints: true,
        starterCode: true,
      },
    });

    if (!problem) throw new Error("Problem not found");
    return problem;
  }

  async getProblemWithTestCases(id: string) {
    const problem = await prisma.problem.findUnique({ where: { id } });
    if (!problem) throw new Error("Problem not found");
    return problem;
  }
}

export const problemService = new ProblemService();
