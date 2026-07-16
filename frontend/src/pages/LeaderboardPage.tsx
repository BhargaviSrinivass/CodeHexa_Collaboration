import { useEffect, useState } from "react";
import { api } from "../services/api";
import { LeaderboardEntry } from "../types";
import { Card } from "../components/ui";

export function LeaderboardPage() {
  const [scope, setScope] = useState<"global" | "friends">("global");
  const [period, setPeriod] = useState<"weekly" | "monthly" | "overall">("overall");
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getLeaderboard(scope, period)
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [scope, period]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Leaderboard</h1>
      <p className="mb-6 text-text-secondary">
        Rankings by problems solved, collaboration, and participation
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {(["global", "friends"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setScope(s)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              scope === s ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"
            }`}
          >
            {s}
          </button>
        ))}
        <span className="mx-2 hidden h-8 w-px bg-border sm:block" />
        {(["weekly", "monthly", "overall"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg px-4 py-2 text-sm capitalize ${
              period === p ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-text-secondary">No rankings yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="pb-3 pr-4">Rank</th>
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Solved</th>
                  <th className="pb-3 pr-4">Collab</th>
                  <th className="pb-3 pr-4">Help</th>
                  <th className="pb-3 pr-4">Rooms</th>
                  <th className="pb-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.userId} className="border-b border-border/50">
                    <td className="py-3 pr-4 font-bold">
                      {r.rank <= 3 ? ["🥇", "🥈", "🥉"][r.rank - 1] : r.rank}
                    </td>
                    <td className="py-3 pr-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                          {r.username[0]?.toUpperCase()}
                        </span>
                        {r.username}
                      </div>
                    </td>
                    <td className="py-3 pr-4">{r.problemsSolved}</td>
                    <td className="py-3 pr-4">{r.collaborationScore}</td>
                    <td className="py-3 pr-4">{r.helpScore}</td>
                    <td className="py-3 pr-4">{r.roomParticipation}</td>
                    <td className="py-3 font-semibold text-accent">{r.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
