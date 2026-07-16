import { AIProvider } from "./types.js";
import { MockAIProvider } from "./mockProvider.js";
import { OpenAIProvider, AnthropicProvider, GeminiProvider } from "./providers.js";
import {
  SYSTEM_MENTOR,
  hintPrompt,
  reviewPrompt,
  complexityPrompt,
  edgeCasePrompt,
  debugPrompt,
  explainSelectionPrompt,
  chatPrompt,
  summaryPrompt,
  roomAiNudgePrompt,
} from "./prompts.js";
import { prisma } from "../../config/prisma.js";

function createProvider(): AIProvider {
  const preferred = (process.env.AI_PROVIDER || "auto").toLowerCase().trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  const geminiKey = process.env.GEMINI_API_KEY?.trim();

  if (preferred === "openai" && openaiKey) return new OpenAIProvider(openaiKey);
  if (preferred === "anthropic" && anthropicKey) return new AnthropicProvider(anthropicKey);
  if (preferred === "gemini" && geminiKey) return new GeminiProvider(geminiKey);

  if (openaiKey) return new OpenAIProvider(openaiKey);
  if (anthropicKey) return new AnthropicProvider(anthropicKey);
  if (geminiKey) return new GeminiProvider(geminiKey);
  return new MockAIProvider();
}

let provider = createProvider();

export function getAIProvider(): AIProvider {
  return provider;
}

/** Reload provider after env changes (tests) */
export function resetAIProvider() {
  provider = createProvider();
}

function sanitize(input: string, max = 12000): string {
  return input.replace(/[\u0000]/g, "").slice(0, max).trim();
}

async function ask(userContent: string): Promise<string> {
  return getAIProvider().generate({
    messages: [
      { role: "system", content: SYSTEM_MENTOR },
      { role: "user", content: sanitize(userContent) },
    ],
  });
}

async function logSession(
  userId: string,
  kind: string,
  meta: Record<string, unknown>,
  reply: string,
  roomId?: string,
  problemId?: string
) {
  const session = await prisma.aISession.create({
    data: {
      userId,
      roomId: roomId || null,
      problemId: problemId || null,
      kind,
      metadata: meta as object,
      chats: {
        create: [
          { userId, role: "assistant", content: reply },
        ],
      },
    },
  });
  return session.id;
}

export const aiService = {
  async hint(params: {
    userId: string;
    problemTitle: string;
    description: string;
    hintLevel: number;
    code?: string;
    language?: string;
    roomId?: string;
    problemId?: string;
  }) {
    const level = Math.min(3, Math.max(1, params.hintLevel));
    const content = await ask(
      hintPrompt({ ...params, hintLevel: level, code: params.code, language: params.language })
    );
    await logSession(params.userId, "hint", { level }, content, params.roomId, params.problemId);
    return { hint: content, level, provider: getAIProvider().name };
  },

  async review(params: {
    userId: string;
    code: string;
    language: string;
    problemTitle?: string;
    roomId?: string;
  }) {
    const content = await ask(reviewPrompt(params));
    const scoreMatch = content.match(/(\d{1,3})\s*\/\s*100/);
    const score = scoreMatch ? Math.min(100, Number(scoreMatch[1])) : null;
    await logSession(params.userId, "review", { score }, content, params.roomId);
    return { review: content, score, provider: getAIProvider().name };
  },

  async complexity(params: { userId: string; code: string; language: string; roomId?: string }) {
    const content = await ask(complexityPrompt(params));
    await logSession(params.userId, "complexity", {}, content, params.roomId);
    return { analysis: content, provider: getAIProvider().name };
  },

  async edgeCases(params: {
    userId: string;
    code: string;
    language: string;
    problemTitle?: string;
    description?: string;
    roomId?: string;
  }) {
    const content = await ask(edgeCasePrompt(params));
    await logSession(params.userId, "edge-cases", {}, content, params.roomId);
    return { edgeCases: content, provider: getAIProvider().name };
  },

  async debug(params: {
    userId: string;
    code: string;
    language: string;
    stderr?: string;
    stdout?: string;
    errorType?: string;
    roomId?: string;
  }) {
    const content = await ask(debugPrompt(params));
    await logSession(params.userId, "debug", {}, content, params.roomId);
    return { debug: content, provider: getAIProvider().name };
  },

  async explain(params: {
    userId: string;
    selection: string;
    language: string;
    context?: string;
    roomId?: string;
  }) {
    const content = await ask(explainSelectionPrompt(params));
    await logSession(params.userId, "explain", {}, content, params.roomId);
    return { explanation: content, provider: getAIProvider().name };
  },

  async chat(params: {
    userId: string;
    message: string;
    sessionId?: string;
    roomId?: string;
    history?: { role: string; content: string }[];
  }) {
    let sessionId = params.sessionId;
    if (!sessionId) {
      const session = await prisma.aISession.create({
        data: { userId: params.userId, roomId: params.roomId || null, kind: "chat" },
      });
      sessionId = session.id;
    }

    const historyText = (params.history || [])
      .slice(-12)
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    await prisma.aIChat.create({
      data: {
        sessionId,
        userId: params.userId,
        role: "user",
        content: sanitize(params.message, 4000),
      },
    });

    const reply = await ask(chatPrompt({ message: params.message, history: historyText }));

    await prisma.aIChat.create({
      data: {
        sessionId,
        userId: params.userId,
        role: "assistant",
        content: reply,
      },
    });

    return { reply, sessionId, provider: getAIProvider().name };
  },

  async summarize(params: {
    userId: string;
    roomId: string;
    problemTitle: string;
    code: string;
    chatHighlights?: string;
  }) {
    const raw = await ask(summaryPrompt(params));
    let parsed: {
      problemsSolved?: string[];
      conceptsLearned?: string[];
      mistakesMade?: string[];
      topicsToRevise?: string[];
      homeworkSuggestions?: string[];
      rawSummary?: string;
    } = {};
    try {
      const jsonStart = raw.indexOf("{");
      const jsonEnd = raw.lastIndexOf("}");
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));
      }
    } catch {
      parsed = { rawSummary: raw };
    }

    const summary = await prisma.sessionSummary.create({
      data: {
        userId: params.userId,
        roomId: params.roomId,
        problemsSolved: parsed.problemsSolved || [],
        conceptsLearned: parsed.conceptsLearned || [],
        mistakesMade: parsed.mistakesMade || [],
        topicsToRevise: parsed.topicsToRevise || [],
        homeworkSuggestions: parsed.homeworkSuggestions || [],
        rawSummary: parsed.rawSummary || raw,
      },
    });

    return { summary, provider: getAIProvider().name };
  },

  async getSummary(roomId: string, userId: string) {
    return prisma.sessionSummary.findFirst({
      where: { roomId, userId },
      orderBy: { createdAt: "desc" },
    });
  },

  async getOrCreateProgress(userId: string) {
    return prisma.progress.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  },

  async recordSolve(userId: string, difficulty: "EASY" | "MEDIUM" | "HARD", topics: string[] = []) {
    const progress = await this.getOrCreateProgress(userId);
    const data: Record<string, unknown> = {
      lastSolvedAt: new Date(),
      weeklyStreak: progress.weeklyStreak + 1,
    };
    if (difficulty === "EASY") data.solvedEasy = progress.solvedEasy + 1;
    if (difficulty === "MEDIUM") data.solvedMedium = progress.solvedMedium + 1;
    if (difficulty === "HARD") data.solvedHard = progress.solvedHard + 1;
    if (topics.length) {
      data.topicsMastered = Array.from(new Set([...progress.topicsMastered, ...topics]));
    }
    return prisma.progress.update({ where: { userId }, data });
  },

  async roomNudge(problemTitle: string, idleMinutes: number) {
    return ask(roomAiNudgePrompt({ problemTitle, idleMinutes }));
  },
};
