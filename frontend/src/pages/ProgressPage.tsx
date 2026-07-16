import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Progress } from "../types";
import { Card } from "../components/ui";

export function ProgressPage() {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProgress()
      .then(setProgress)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const total =
    (progress?.solvedEasy || 0) +
    (progress?.solvedMedium || 0) +
    (progress?.solvedHard || 0);

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold">Personal Progress</h1>
      <p className="mb-8 text-text-secondary">
        Track solved problems, topics, and your weekly streak
      </p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-text-secondary">Total Solved</p>
          <p className="mt-1 text-3xl font-bold">{total}</p>
        </Card>
        <Card>
          <p className="text-xs text-success">Easy</p>
          <p className="mt-1 text-3xl font-bold text-success">{progress?.solvedEasy ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-warning">Medium</p>
          <p className="mt-1 text-3xl font-bold text-warning">{progress?.solvedMedium ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-error">Hard</p>
          <p className="mt-1 text-3xl font-bold text-error">{progress?.solvedHard ?? 0}</p>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-2 font-semibold">Weekly Streak</h3>
          <p className="text-4xl font-bold text-accent">{progress?.weeklyStreak ?? 0}</p>
          <p className="mt-2 text-sm text-text-secondary">
            {progress?.lastSolvedAt
              ? `Last solved ${new Date(progress.lastSolvedAt).toLocaleDateString()}`
              : "Solve a problem to start your streak"}
          </p>
        </Card>
        <Card>
          <h3 className="mb-2 font-semibold">Topics Mastered</h3>
          {progress?.topicsMastered?.length ? (
            <div className="flex flex-wrap gap-2">
              {progress.topicsMastered.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-success/15 px-3 py-1 text-xs text-success"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No topics yet — keep practicing</p>
          )}
          {!!progress?.weakTopics?.length && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-medium text-warning">Weak topics</h4>
              <div className="flex flex-wrap gap-2">
                {progress.weakTopics.map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-warning/15 px-3 py-1 text-xs text-warning"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
