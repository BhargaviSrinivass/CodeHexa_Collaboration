import { AIGenerateOptions, AIProvider } from "./types.js";

/** Offline mentor responses when no API key is configured */
export class MockAIProvider implements AIProvider {
  readonly name = "mock";

  async generate(options: AIGenerateOptions): Promise<string> {
    const last = options.messages.filter((m) => m.role === "user").at(-1)?.content || "";
    const lower = last.toLowerCase();

    if (lower.includes("hint level 1")) {
      return `**Hint 1 — Understand the problem**\n\nRestate what the input and output mean in your own words. What is the simplest example you can invent? Identify constraints that affect your approach.`;
    }
    if (lower.includes("hint level 2")) {
      return `**Hint 2 — Choose a structure**\n\nAsk: do you need fast lookups of values you've already seen? A HashMap (or hash set) often helps when you search for complements or duplicates.`;
    }
    if (lower.includes("hint level 3")) {
      return `**Hint 3 — Complexity nudge**\n\nCan you solve this in a single pass — O(n) time and O(n) extra space? Avoid nested loops over the same array when a map would let you look up answers instantly.`;
    }
    if (lower.includes("score out of 100") || lower.includes("analyze: readability")) {
      return `## Code Review\n\n**Score: 72/100**\n\n### Strengths\n- Clear problem intent\n- Readable structure overall\n\n### Issues\n- Watch edge cases (empty input, single element)\n- Naming could be more descriptive\n\n### Improvements\n- Extract helpers for repeated logic\n- Document assumptions about input`;
    }
    if (lower.includes("time and space complexity")) {
      return `## Complexity\n\n- **Time:** O(n) if you scan once with a map; O(n²) if nested loops\n- **Space:** O(n) for an auxiliary map\n\n**Reasoning:** Each element is visited a constant number of times with hashing.\n\n**Optimization:** Prefer a one-pass hash map over double loops.`;
    }
    if (lower.includes("missing test cases")) {
      return `## Suggested Edge Cases\n\n- Empty array / empty string\n- Single element\n- Negative numbers\n- Duplicate values\n- Already sorted / reverse sorted\n- Large input near constraints\n- All identical values`;
    }
    if (lower.includes("compilation") || lower.includes("stderr")) {
      return `## Debug Assistant\n\nThis looks like a **logic or runtime** issue depending on whether it compiled.\n\n1. Read the first error line carefully.\n2. Check null / bounds around the failing index.\n3. Add a small print for intermediate state — don't rewrite everything.`;
    }
    if (lower.includes("code selection") || lower.includes("beginner-friendly")) {
      return `## Concept\n\nThis selection is building or querying a structure step by step.\n\nIn plain words: you store information as you go so later questions are cheap to answer — like sticky notes of what you've already seen (HashMap / set).`;
    }
    if (lower.includes("return json with keys")) {
      return JSON.stringify({
        problemsSolved: ["Current problem progress"],
        conceptsLearned: ["Hash maps", "Two pointers", "Complexity"],
        mistakesMade: ["Missed edge cases", "Nested loop first"],
        topicsToRevise: ["Hashing", "Big-O"],
        homeworkSuggestions: ["Re-solve without looking", "Write 3 edge-case tests"],
        rawSummary: "Solid collaborative session. Practice edge cases next.",
      });
    }
    if (lower.includes("gentle optional offer")) {
      return `Need a Hint? Or shall we walk through a small example together?`;
    }

    return `I'm your CollabMentor. Ask me about approaches, complexity, or concepts.\n\nI won't dump a full solution unless you explicitly ask.\n\n_(Using offline mentor mode — set OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY for live models.)_`;
  }
}
