import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { api } from "../services/api";
import { Problem, RunResult, Language } from "../types";
import { Button, DifficultyBadge } from "../components/ui";
import { TestCasePanel } from "../components/room/TestCasePanel";

const LANG_MAP: Record<Language, string> = {
  java: "java",
  python: "python",
  cpp: "cpp",
  javascript: "javascript",
};

export function ProblemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("java");
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [collaborating, setCollaborating] = useState(false);
  const [customInput, setCustomInput] = useState("");
  const [testTab, setTestTab] = useState<"input" | "output" | "console">("output");
  const [testHeight, setTestHeight] = useState(180);

  useEffect(() => {
    if (!id) return;
    api.getProblem(id).then((p) => {
      setProblem(p);
      setCode(p.starterCode || "");
    });
  }, [id]);

  const run = async (mode: "tests" | "custom") => {
    if (!id) return;
    setRunning(true);
    setTestTab(mode === "custom" ? "console" : "output");
    try {
      const result = await api.runCode({
        code,
        problemId: id,
        language,
        mode,
        stdin: customInput,
      });
      setRunResult(result);
      if (mode === "tests") {
        setTestTab("output");
        if (result.allPassed && problem) {
          await api.recordSolve(problem.difficulty, ["arrays"]).catch(() => {});
        }
      }
    } catch (err) {
      setRunResult({
        stdout: "",
        stderr: (err as Error).message,
        executionTimeMs: 0,
        results: [],
        allPassed: false,
      });
      setTestTab("console");
    } finally {
      setRunning(false);
    }
  };

  const handleCollaborate = async () => {
    if (!id) return;
    setCollaborating(true);
    try {
      const room = await api.createRoom(id);
      navigate(`/room/${room.id}`);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setCollaborating(false);
    }
  };

  const formatDescription = useCallback((text: string) => {
    return text.split("`").map((part, i) =>
      i % 2 === 1 ? (
        <code key={i} className="rounded bg-bg-tertiary px-1.5 py-0.5 text-sm text-accent">
          {part}
        </code>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  }, []);

  const startResizeTest = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = testHeight;
    const onMove = (ev: MouseEvent) => {
      setTestHeight(Math.min(360, Math.max(100, startH + (startY - ev.clientY))));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  if (!problem) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border bg-bg-secondary px-4 py-2">
        <div className="flex items-center gap-3">
          <h1 className="font-semibold">{problem.title}</h1>
          <DifficultyBadge difficulty={problem.difficulty} />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded border border-border bg-bg-primary px-2 py-1 text-xs"
          >
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="javascript">JavaScript</option>
          </select>
          <Button size="sm" onClick={handleCollaborate} disabled={collaborating}>
            {collaborating ? "Creating..." : "👥 Collaborate"}
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-y-auto border-r border-border p-6">
          <div className="mb-6 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">
            {formatDescription(problem.description || "")}
          </div>

          {problem.examples?.map((ex, i) => (
            <div key={i} className="mb-4 rounded-lg border border-border bg-bg-secondary p-4">
              <p className="mb-2 text-sm font-medium">Example {i + 1}:</p>
              <div className="text-sm text-text-secondary">Input: {ex.input}</div>
              <div className="text-sm text-text-secondary">Output: {ex.output}</div>
              {ex.explanation && (
                <div className="mt-1 text-sm text-text-secondary/70">{ex.explanation}</div>
              )}
            </div>
          ))}

          {problem.constraints && (
            <div className="mt-4">
              <p className="mb-2 font-medium">Constraints:</p>
              <ul className="list-disc pl-5 text-sm text-text-secondary">
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex w-1/2 flex-col">
          <div className="flex-1">
            <Editor
              height="100%"
              language={LANG_MAP[language]}
              theme="vs-dark"
              value={code}
              onChange={(v) => setCode(v || "")}
              options={{
                fontSize: 14,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                automaticLayout: true,
              }}
            />
          </div>
          <div
            onMouseDown={startResizeTest}
            className="h-1 cursor-row-resize bg-border hover:bg-accent"
          />
          <div style={{ height: testHeight }}>
            <TestCasePanel
              customInput={customInput}
              onCustomInputChange={setCustomInput}
              runResult={runResult}
              running={running}
              onRunTests={() => run("tests")}
              onRunCustom={() => run("custom")}
              activeTab={testTab}
              onTabChange={setTestTab}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
