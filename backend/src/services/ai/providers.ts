import { AIGenerateOptions, AIProvider } from "./types.js";

export class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  constructor(private apiKey: string, private model = "gpt-4o-mini") {}

  async generate(options: AIGenerateOptions): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1200,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OpenAI error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content || "";
  }
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  constructor(private apiKey: string, private model = "claude-3-5-haiku-latest") {}

  async generate(options: AIGenerateOptions): Promise<string> {
    const system = options.messages.find((m) => m.role === "system")?.content || "";
    const msgs = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: options.maxTokens ?? 1200,
        system,
        messages: msgs,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Anthropic error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return data.content?.find((c) => c.type === "text")?.text || "";
  }
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  constructor(
    private apiKey: string,
    private model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash"
  ) {}

  async generate(options: AIGenerateOptions): Promise<string> {
    const system = options.messages.find((m) => m.role === "system")?.content || "";
    const contents = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: system ? { parts: [{ text: system }] } : undefined,
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.4,
          maxOutputTokens: options.maxTokens ?? 1200,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini error: ${res.status} ${err}`);
    }
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}
