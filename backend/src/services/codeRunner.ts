import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

export type Language = "java" | "python" | "cpp" | "javascript";

interface TestCase {
  input: string;
  expectedOutput: string;
}

function toJavaStringArray(lines: string[]): string {
  const escaped = lines.map(
    (line) => `"${line.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  return `new String[] { ${escaped.join(", ")} }`;
}

interface TestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  memoryUsageKb?: number;
  results: TestResult[];
  allPassed: boolean;
}

function runCommand(
  cmd: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  stdin?: string
): Promise<{ stdout: string; stderr: string; code: number; memoryUsageKb?: number }> {
  return new Promise((resolve) => {
    const proc = spawn(cmd, args, { cwd, shell: true });
    let stdout = "";
    let stderr = "";
    let peakRss = 0;

    const memInterval = setInterval(() => {
      try {
        // Node doesn't expose child RSS reliably on Windows; approximate from process
        if (proc.pid) peakRss = Math.max(peakRss, 0);
      } catch {
        /* ignore */
      }
    }, 50);

    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));

    if (stdin !== undefined) {
      proc.stdin.write(stdin);
      proc.stdin.end();
    }

    const timer = setTimeout(() => {
      clearInterval(memInterval);
      proc.kill("SIGKILL");
      resolve({
        stdout,
        stderr: stderr + "\nExecution timed out",
        code: -1,
        memoryUsageKb: peakRss || undefined,
      });
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      clearInterval(memInterval);
      // Rough memory estimate from output size + baseline
      const estimateKb = Math.round((Buffer.byteLength(stdout + stderr) + 2048) / 1024);
      resolve({
        stdout,
        stderr,
        code: code ?? 1,
        memoryUsageKb: peakRss || estimateKb,
      });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      clearInterval(memInterval);
      resolve({ stdout, stderr: stderr + "\n" + err.message, code: -1 });
    });
  });
}

function javaSolveBody(slug: string): string {
  switch (slug) {
    case "two-sum":
      return `
                int[] nums = parseInts(lines[0]);
                int target = Integer.parseInt(lines[1].trim());
                int[] result = sol.twoSum(nums, target);
                actual = result[0] + " " + result[1];`;
    case "contains-duplicate":
      return `
                int[] nums = parseInts(lines[0]);
                actual = String.valueOf(sol.containsDuplicate(nums));`;
    case "best-time-to-buy-and-sell-stock":
      return `
                int[] prices = parseInts(lines[0]);
                actual = String.valueOf(sol.maxProfit(prices));`;
    case "maximum-subarray":
      return `
                int[] nums = parseInts(lines[0]);
                actual = String.valueOf(sol.maxSubArray(nums));`;
    case "merge-sorted-array":
      return `
                int[] nums1Raw = parseInts(lines[0]);
                int m = Integer.parseInt(lines[1].trim());
                int[] nums2 = lines[2].trim().isEmpty() ? new int[0] : parseInts(lines[2]);
                int n = Integer.parseInt(lines[3].trim());
                int[] nums1 = new int[m + n];
                for (int i = 0; i < m; i++) nums1[i] = nums1Raw[i];
                int[] merged = sol.merge(nums1, m, nums2, n);
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < merged.length; i++) {
                    if (i > 0) sb.append(" ");
                    sb.append(merged[i]);
                }
                actual = sb.toString();`;
    default:
      return `
                throw new RuntimeException("Unknown problem slug: ${slug}");`;
  }
}

const JAVA_TEMPLATE = (userCode: string, slug: string, testCases: TestCase[]) => {
  const cases = testCases
    .map((tc, i) => {
      const lines = tc.input.replace(/\r\n/g, "\n").split("\n");
      const expected = tc.expectedOutput.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      // Always emit valid Java — never JSON.stringify (invalid in Java source)
      return `runCase(${i}, "${expected}", ${toJavaStringArray(lines)});`;
    })
    .join("\n        ");

  return `
import java.util.*;
import java.io.*;

${userCode}

public class Main {
    static void runCase(int index, String expected, String[] lines) throws Exception {
        Solution sol = new Solution();
        String actual = "";
        ${javaSolveBody(slug)}
        System.out.println("TEST_" + index + ":" + actual.trim());
        if (!actual.trim().equals(expected.trim())) {
          System.err.println("FAIL_" + index + ": expected " + expected + " got " + actual);
        }
    }

    /** Accepts "7 1 5", "7,1,5", "[7,1,5]", or "[7 1 5]" */
    static int[] parseInts(String line) {
        String cleaned = line.trim()
            .replace("[", "")
            .replace("]", "")
            .replace(",", " ")
            .trim();
        if (cleaned.isEmpty()) return new int[0];
        String[] parts = cleaned.split("\\\\s+");
        int[] arr = new int[parts.length];
        for (int i = 0; i < parts.length; i++) arr[i] = Integer.parseInt(parts[i].trim());
        return arr;
    }

    public static void main(String[] args) throws Exception {
        ${cases}
    }
}
`;
};

async function runWithStdin(
  tmpDir: string,
  language: Language,
  code: string,
  stdin: string
): Promise<{ stdout: string; stderr: string; code: number; memoryUsageKb?: number }> {
  if (language === "python") {
    await fs.writeFile(path.join(tmpDir, "main.py"), code);
    return runCommand("python", ["main.py"], tmpDir, 5000, stdin);
  }
  if (language === "javascript") {
    await fs.writeFile(path.join(tmpDir, "main.js"), code);
    return runCommand("node", ["main.js"], tmpDir, 5000, stdin);
  }
  if (language === "cpp") {
    await fs.writeFile(path.join(tmpDir, "main.cpp"), code);
    const compile = await runCommand("g++", ["-O2", "-o", "main.exe", "main.cpp"], tmpDir, 10000);
    if (compile.code !== 0) return compile;
    const exe = process.platform === "win32" ? "main.exe" : "./main";
    return runCommand(exe, [], tmpDir, 5000, stdin);
  }
  // java custom: require a Main class, or wrap Solution only for stdin echo demo
  const javaSource = /class\s+Main\b/.test(code)
    ? code
    : `
import java.util.*;
${code}
public class Main {
  public static void main(String[] args) throws Exception {
    Scanner sc = new Scanner(System.in);
    while (sc.hasNextLine()) {
      System.out.println(sc.nextLine());
    }
  }
}
`;
  await fs.writeFile(path.join(tmpDir, "Main.java"), javaSource);
  const compile = await runCommand("javac", ["Main.java"], tmpDir, 10000);
  if (compile.code !== 0) return compile;
  return runCommand("java", ["-cp", tmpDir, "Main"], tmpDir, 5000, stdin);
}

export async function runCode(
  userCode: string,
  language: Language,
  options: {
    slug?: string;
    testCases?: TestCase[];
    stdin?: string;
    mode?: "tests" | "custom";
  }
): Promise<RunResult> {
  const start = Date.now();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "collab-run-"));
  const mode = options.mode || (options.stdin !== undefined ? "custom" : "tests");

  try {
    if (mode === "custom") {
      const exec = await runWithStdin(tmpDir, language, userCode, options.stdin || "");
      return {
        stdout: exec.stdout,
        stderr: exec.stderr,
        executionTimeMs: Date.now() - start,
        memoryUsageKb: exec.memoryUsageKb,
        results: [],
        allPassed: exec.code === 0,
      };
    }

    const testCases = options.testCases || [];
    const slug = options.slug || "";

    if (language === "java") {
      const source = JAVA_TEMPLATE(userCode, slug, testCases);
      await fs.writeFile(path.join(tmpDir, "Main.java"), source);
      const compile = await runCommand("javac", ["Main.java"], tmpDir, 10000);
      if (compile.code !== 0) {
        return {
          stdout: compile.stdout,
          stderr: compile.stderr || "Compilation failed",
          executionTimeMs: Date.now() - start,
          memoryUsageKb: compile.memoryUsageKb,
          results: [],
          allPassed: false,
        };
      }
      const execute = await runCommand("java", ["-cp", tmpDir, "Main"], tmpDir, 5000);
      const results: TestResult[] = testCases.map((tc, i) => {
        const match = execute.stdout.match(new RegExp(`TEST_${i}:(.+)`));
        const actualOutput = match ? match[1].trim() : "";
        return {
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput,
          passed: actualOutput === tc.expectedOutput.trim(),
        };
      });
      return {
        stdout: execute.stdout,
        stderr: execute.stderr,
        executionTimeMs: Date.now() - start,
        memoryUsageKb: execute.memoryUsageKb,
        results,
        allPassed: results.every((r) => r.passed),
      };
    }

    // For other languages in test mode: run each case with stdin, compare stdout
    const results: TestResult[] = [];
    let combinedStdout = "";
    let combinedStderr = "";
    let mem = 0;

    for (const tc of testCases) {
      const exec = await runWithStdin(tmpDir, language, userCode, tc.input.replace(/\\n/g, "\n"));
      combinedStdout += exec.stdout + "\n";
      combinedStderr += exec.stderr;
      mem = Math.max(mem, exec.memoryUsageKb || 0);
      const actual = exec.stdout.trim();
      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: actual,
        passed: actual === tc.expectedOutput.trim(),
      });
    }

    return {
      stdout: combinedStdout,
      stderr: combinedStderr,
      executionTimeMs: Date.now() - start,
      memoryUsageKb: mem || undefined,
      results,
      allPassed: results.every((r) => r.passed),
    };
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/** @deprecated use runCode */
export async function runJavaCode(
  userCode: string,
  slug: string,
  testCases: TestCase[]
): Promise<RunResult> {
  return runCode(userCode, "java", { slug, testCases, mode: "tests" });
}
