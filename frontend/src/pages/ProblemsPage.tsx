import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Problem } from "../types";
import { DifficultyBadge } from "../components/ui";

export function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProblems()
      .then(setProblems)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold">Problems</h1>
      <p className="mb-6 text-text-secondary">Array problems to practice with friends</p>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead className="bg-bg-secondary">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Title</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Difficulty</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((problem, i) => (
              <tr
                key={problem.id}
                className="border-t border-border hover:bg-bg-secondary/50 transition-colors"
              >
                <td className="px-4 py-3 text-text-secondary">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    to={`/problems/${problem.id}`}
                    className="text-text-primary hover:text-accent transition-colors"
                  >
                    {problem.title}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <DifficultyBadge difficulty={problem.difficulty} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
