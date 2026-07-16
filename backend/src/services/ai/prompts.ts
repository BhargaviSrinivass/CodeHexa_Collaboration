/**
 * Modular AI prompt templates.
 * AI acts as a mentor — never dump full solutions unless asked.
 */

export const SYSTEM_MENTOR = `You are CollabMentor, an AI coding tutor for students.
Rules:
- Guide with Socratic questions and progressive hints.
- Never reveal a complete solution unless the user explicitly asks for the full solution.
- Prefer explanations of concepts over pasting code.
- Keep replies concise, encouraging, and beginner-friendly.
- Use Markdown with code fences when showing small snippets (helpers only, not full answers).`;

export function hintPrompt(opts: {
  problemTitle: string;
  description: string;
  hintLevel: number;
  code?: string;
  language?: string;
}) {
  return `Problem: ${opts.problemTitle}
Description:
${opts.description}

Student language: ${opts.language || "java"}
Current code (may be incomplete):
\`\`\`
${opts.code || "(empty)"}
\`\`\`

Give Hint level ${opts.hintLevel} only (1 = understand problem, 2 = approach/data structure, 3 = complexity/algorithm nudge).
Do NOT give full code. One short hint paragraph.`;
}

export function reviewPrompt(opts: {
  code: string;
  language: string;
  problemTitle?: string;
}) {
  return `Review this ${opts.language} code for problem "${opts.problemTitle || "unknown"}":
\`\`\`
${opts.code}
\`\`\`

Analyze: readability, naming, structure, edge cases, optimization.
Return Markdown with:
- Score out of 100
- Strengths
- Issues
- Suggested improvements (no full rewrite)`;
}

export function complexityPrompt(opts: { code: string; language: string }) {
  return `Analyze time and space complexity of this ${opts.language} code:
\`\`\`
${opts.code}
\`\`\`

Explain Time Complexity, Space Complexity, reasoning, and optimization ideas.
Do not rewrite the whole solution.`;
}

export function edgeCasePrompt(opts: {
  code: string;
  language: string;
  problemTitle?: string;
  description?: string;
}) {
  return `Given problem "${opts.problemTitle || ""}" and code:
\`\`\`
${opts.code}
\`\`\`
${opts.description ? `Problem description:\n${opts.description}` : ""}

Suggest missing test cases: empty array, negatives, duplicates, large input, etc.
List them as bullet points with brief why.`;
}

export function debugPrompt(opts: {
  code: string;
  language: string;
  stderr?: string;
  stdout?: string;
  errorType?: string;
}) {
  return `Student ${opts.language} code failed.
Error type hint: ${opts.errorType || "unknown"}
stderr:
${opts.stderr || "(none)"}
stdout:
${opts.stdout || "(none)"}

Code:
\`\`\`
${opts.code}
\`\`\`

Explain if this is Compilation / Runtime / Logic error.
Suggest how to fix without rewriting the entire solution.`;
}

export function explainSelectionPrompt(opts: {
  selection: string;
  language: string;
  context?: string;
}) {
  return `Explain this ${opts.language} code selection in beginner-friendly language:
\`\`\`
${opts.selection}
\`\`\`
${opts.context ? `Surrounding context:\n${opts.context}` : ""}

Relate to concepts like HashMap, loops, binary search, recursion, DP, graphs, trees when relevant.`;
}

export function chatPrompt(opts: { message: string; history?: string }) {
  return `${opts.history ? `Conversation so far:\n${opts.history}\n\n` : ""}Student asks: ${opts.message}

Answer as a mentor. Do not provide full problem solutions.`;
}

export function summaryPrompt(opts: {
  problemTitle: string;
  code: string;
  chatHighlights?: string;
}) {
  return `Summarize a collaborative coding session.
Problem: ${opts.problemTitle}
Final code sample:
\`\`\`
${opts.code}
\`\`\`
${opts.chatHighlights ? `Chat/AI highlights:\n${opts.chatHighlights}` : ""}

Return JSON with keys:
problemsSolved (string[]), conceptsLearned (string[]), mistakesMade (string[]), topicsToRevise (string[]), homeworkSuggestions (string[]), rawSummary (string).`;
}

export function roomAiNudgePrompt(opts: {
  problemTitle: string;
  idleMinutes: number;
}) {
  return `Students have been quiet for ~${opts.idleMinutes} minutes on "${opts.problemTitle}".
Suggest ONE gentle optional offer: Need a Hint? Need Example? Complexity Analysis?
One short sentence. Do not lecture.`;
}
