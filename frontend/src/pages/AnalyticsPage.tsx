import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { AnalyticsDashboard } from "../types";
import { Card } from "../components/ui";
import { ActivityChart, DistributionChart } from "../components/analytics/ActivityChart";

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAnalytics()
      .then(setData)
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

  const p = data?.progress;
  const total =
    (p?.solvedEasy || 0) + (p?.solvedMedium || 0) + (p?.solvedHard || 0);

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Analytics</h1>
      <p className="mb-6 text-text-secondary">Your coding journey at a glance</p>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <p className="text-xs text-text-secondary">Problems Solved</p>
          <p className="mt-1 text-3xl font-bold">{total}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">Current Streak</p>
          <p className="mt-1 text-3xl font-bold text-accent">{p?.weeklyStreak ?? 0}</p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">Avg Session</p>
          <p className="mt-1 text-3xl font-bold">
            {Math.round((data?.averageSessionDurationSec || 0) / 60)}m
          </p>
        </Card>
        <Card>
          <p className="text-xs text-text-secondary">Favorite Language</p>
          <p className="mt-1 text-3xl font-bold capitalize">
            {data?.favoriteLanguage || "java"}
          </p>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <ActivityChart data={data?.weeklyActivity || {}} title="Weekly Activity" />
        </Card>
        <Card>
          <ActivityChart
            data={data?.monthlyActivity || {}}
            title="Monthly Activity"
            color="var(--color-success)"
          />
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <DistributionChart
            title="Difficulty Distribution"
            data={[
              {
                label: "Easy",
                value: data?.difficultyDistribution.easy || 0,
                color: "var(--color-success)",
              },
              {
                label: "Medium",
                value: data?.difficultyDistribution.medium || 0,
                color: "var(--color-warning)",
              },
              {
                label: "Hard",
                value: data?.difficultyDistribution.hard || 0,
                color: "var(--color-error)",
              },
            ]}
          />
        </Card>
        <Card>
          <DistributionChart
            title="Topic Distribution"
            data={Object.entries(data?.topicDistribution || {}).map(([label, value]) => ({
              label,
              value,
            }))}
          />
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h3 className="mb-3 font-semibold">Collaboration Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{p?.collaborationScore ?? 0}</p>
              <p className="text-xs text-text-secondary">Collab Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{p?.helpScore ?? 0}</p>
              <p className="text-xs text-text-secondary">Helping Others</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{p?.roomParticipation ?? 0}</p>
              <p className="text-xs text-text-secondary">Room Sessions</p>
            </div>
          </div>
        </Card>
        <Card>
          <h3 className="mb-3 font-semibold">Most Solved Topics</h3>
          {data?.mostSolvedTopics?.length ? (
            <ul className="space-y-1 text-sm">
              {data.mostSolvedTopics.map((t) => (
                <li key={t.topic} className="flex justify-between">
                  <span>{t.topic}</span>
                  <span className="text-text-secondary">{t.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">Solve problems to see topics</p>
          )}
        </Card>
      </div>

      {!!data?.recentSessions?.length && (
        <Card className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Sessions</h3>
            <Link to="/sessions" className="text-xs text-accent hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2 text-sm">
            {data.recentSessions.slice(0, 5).map((s) => (
              <li key={s.id} className="flex justify-between border-b border-border pb-2">
                <span>{s.roomName}</span>
                <span className="text-text-secondary">
                  {Math.round(s.durationSec / 60)}m · {new Date(s.startedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
