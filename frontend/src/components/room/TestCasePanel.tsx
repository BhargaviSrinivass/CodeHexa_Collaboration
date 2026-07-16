import { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RunResult } from "../../types";
import { Button } from "../ui";

interface TestCasePanelProps {
  customInput: string;
  onCustomInputChange: (v: string) => void;
  runResult: RunResult | null;
  running: boolean;
  onRunTests: () => void;
  onRunCustom: () => void;
  activeTab: "input" | "output" | "console";
  onTabChange: (t: "input" | "output" | "console") => void;
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function classifyError(stderr: string): "compile" | "runtime" | "error" | null {
  if (!stderr) return null;
  const s = stderr.toLowerCase();
  if (s.includes("error:") || s.includes("compilation") || s.includes("cannot find symbol") || s.includes("illegal start")) {
    return "compile";
  }
  if (s.includes("exception") || s.includes("runtime") || s.includes("nullpointer") || s.includes("timed out")) {
    return "runtime";
  }
  return "error";
}

export const TestCasePanel = memo(function TestCasePanel({
  customInput,
  onCustomInputChange,
  runResult,
  running,
  onRunTests,
  onRunCustom,
  activeTab,
  onTabChange,
}: TestCasePanelProps) {
  const [caseIndex, setCaseIndex] = useState(0);
  const results = runResult?.results ?? [];
  const selected = results[caseIndex];
  const errKind = runResult?.stderr && !results.length ? classifyError(runResult.stderr) : null;

  useEffect(() => {
    if (results.length) setCaseIndex(0);
  }, [runResult]);

  const statusLabel = !runResult
    ? null
    : running
      ? "Running"
      : errKind === "compile"
        ? "Compile Error"
        : errKind === "runtime"
          ? "Runtime Error"
          : errKind
            ? "Error"
            : runResult.allPassed
              ? "Accepted"
              : "Wrong Answer";

  const statusColor =
    statusLabel === "Accepted"
      ? "text-success"
      : statusLabel === "Compile Error"
        ? "text-orange-500"
        : statusLabel === "Runtime Error"
          ? "text-warning"
          : statusLabel === "Wrong Answer" || statusLabel === "Error"
            ? "text-error"
            : "text-text-secondary";

  return (
    <div className="flex h-full flex-col border-t border-border bg-bg-primary">
      <div className="flex items-center gap-1 border-b border-border px-2">
        <button
          onClick={() => onTabChange("input")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "input"
              ? "border-accent text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Testcase
        </button>
        <span className="text-border">|</span>
        <button
          onClick={() => onTabChange("output")}
          className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "output"
              ? "border-accent text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Test Result
        </button>
        <button
          onClick={() => onTabChange("console")}
          className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === "console"
              ? "border-accent text-text-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          Console
        </button>
        <div className="ml-auto flex gap-2 py-1">
          <Button size="sm" variant="secondary" onClick={onRunCustom} disabled={running}>
            {running ? "…" : "Run"}
          </Button>
          <Button size="sm" onClick={onRunTests} disabled={running}>
            {running ? "Running…" : "Submit"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 text-sm">
        {activeTab === "input" && (
          <div className="flex h-full flex-col gap-2">
            <p className="text-xs text-text-secondary">Custom Input</p>
            <textarea
              value={customInput}
              onChange={(e) => onCustomInputChange(e.target.value)}
              placeholder="Enter custom stdin…"
              className="min-h-[100px] flex-1 resize-none rounded-xl border border-border bg-bg-secondary p-3 font-mono text-xs text-text-primary focus:border-accent focus:outline-none"
            />
          </div>
        )}

        {activeTab === "output" && (
          <div>
            <AnimatePresence mode="wait">
              {running && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-2"
                >
                  <p className="font-medium text-accent">Running…</p>
                  <p className="text-xs text-text-secondary">Processing test cases</p>
                  <div className="skeleton h-2 w-1/2" />
                </motion.div>
              )}
            </AnimatePresence>

            {!running && runResult && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-4 flex flex-wrap items-baseline gap-3">
                  <span className={`text-2xl font-semibold ${statusColor}`}>
                    {statusLabel === "Accepted" && "✓ "}
                    {(statusLabel === "Wrong Answer" || statusLabel === "Error") && "✗ "}
                    {statusLabel}
                  </span>
                  <span className="text-sm text-text-secondary">
                    Runtime: {runResult.executionTimeMs} ms
                    {runResult.memoryUsageKb != null &&
                      ` · Memory: ~${runResult.memoryUsageKb} KB`}
                  </span>
                </div>

                {statusLabel === "Accepted" && (
                  <p className="mb-4 rounded-xl bg-success/10 px-3 py-2 text-sm text-success">
                    All test cases passed — solution submitted successfully.
                  </p>
                )}

                {results.length > 0 && (
                  <>
                    <div className="mb-4 flex flex-wrap gap-2">
                      {results.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => setCaseIndex(i)}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm transition-colors ${
                            caseIndex === i
                              ? "bg-bg-tertiary text-text-primary ring-1 ring-accent/30"
                              : "bg-transparent text-text-secondary hover:bg-bg-secondary"
                          }`}
                        >
                          <span className={r.passed ? "text-success" : "text-error"}>
                            {r.passed ? "✓" : "✗"}
                          </span>
                          Case {i + 1}
                        </button>
                      ))}
                    </div>

                    {selected && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              selected.passed
                                ? "bg-success/10 text-success"
                                : "bg-error/10 text-error"
                            }`}
                          >
                            {selected.passed ? "Accepted" : "Wrong Answer"}
                          </span>
                        </div>
                        <ResultBlock
                          label="Input"
                          value={selected.input}
                          onCopy={() => copyText(selected.input)}
                        />
                        <ResultBlock
                          label="Output"
                          value={selected.actualOutput || "(empty)"}
                          onCopy={() => copyText(selected.actualOutput)}
                          tone={selected.passed ? "ok" : "bad"}
                        />
                        <ResultBlock
                          label="Expected"
                          value={selected.expectedOutput}
                          onCopy={() => copyText(selected.expectedOutput)}
                          tone="ok"
                        />
                        {!selected.passed && (
                          <ResultBlock
                            label="Difference"
                            value={`Expected "${selected.expectedOutput}" but got "${selected.actualOutput || "(empty)"}"`}
                            onCopy={() => {}}
                            tone="bad"
                          />
                        )}
                      </div>
                    )}
                  </>
                )}

                {runResult.stderr && !results.length && (
                  <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-error/10 p-3 font-mono text-xs text-error">
                    {runResult.stderr}
                  </pre>
                )}
              </motion.div>
            )}

            {!running && !runResult && (
              <p className="text-text-secondary">
                Click <strong>Submit</strong> to run all test cases, or{" "}
                <strong>Run</strong> with custom input.
              </p>
            )}
          </div>
        )}

        {activeTab === "console" && (
          <div className="space-y-2 font-mono text-xs">
            {running && <p className="text-accent">Running… Processing…</p>}
            {runResult ? (
              <>
                <div className="text-text-secondary">
                  Time: {runResult.executionTimeMs}ms
                  {runResult.memoryUsageKb != null &&
                    ` · Memory: ~${runResult.memoryUsageKb}KB`}
                </div>
                {runResult.stdout && (
                  <pre className="whitespace-pre-wrap text-success">{runResult.stdout}</pre>
                )}
                {runResult.stderr && (
                  <pre className="whitespace-pre-wrap text-error">{runResult.stderr}</pre>
                )}
                {!runResult.stdout && !runResult.stderr && (
                  <p className="text-text-secondary">No console output</p>
                )}
              </>
            ) : (
              <p className="text-text-secondary">Console is empty</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

function ResultBlock({
  label,
  value,
  onCopy,
  tone,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  tone?: "ok" | "bad";
}) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-text-secondary">{label}</p>
      <div
        className={`relative rounded-xl px-3 py-2.5 font-mono text-sm ${
          tone === "bad"
            ? "bg-error/5 text-error"
            : tone === "ok"
              ? "bg-success/5 text-text-primary"
              : "bg-bg-secondary text-text-primary"
        }`}
      >
        <pre className="whitespace-pre-wrap pr-8">{value}</pre>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            className="absolute right-2 top-2 rounded p-1 text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
            title="Copy"
          >
            ⧉
          </button>
        )}
      </div>
    </div>
  );
}
