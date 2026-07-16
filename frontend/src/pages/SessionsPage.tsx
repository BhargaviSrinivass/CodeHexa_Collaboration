import { useEffect, useState } from "react";
import { api } from "../services/api";
import { CollabSession } from "../types";
import { Card } from "../components/ui";

export function SessionsPage() {
  const [sessions, setSessions] = useState<CollabSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api
      .getSessions()
      .then(setSessions)
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

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Session History</h1>
      <p className="mb-6 text-text-secondary">Every collaborative coding session you joined</p>

      {sessions.length === 0 ? (
        <Card>
          <p className="text-text-secondary">No sessions yet — join a room to start collaborating</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.map((s) => (
            <Card key={s.id}>
              <button
                className="w-full text-left"
                onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">{s.roomName}</h3>
                    <p className="text-sm text-text-secondary">
                      {s.problemTitle || "Coding session"} ·{" "}
                      {new Date(s.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>{Math.round(s.durationSec / 60)} min</p>
                    <p className="text-text-secondary">{s.participants.length} participants</p>
                  </div>
                </div>
              </button>

              {expanded === s.id && (
                <div className="mt-4 border-t border-border pt-4 text-sm">
                  <p className="mb-2">
                    <span className="text-text-secondary">Participants: </span>
                    {s.participants.join(", ")}
                  </p>
                  <p className="mb-2">
                    <span className="text-text-secondary">Messages: </span>
                    {s.messagesCount}
                  </p>
                  {s.problemsSolved.length > 0 && (
                    <p className="mb-2">
                      <span className="text-text-secondary">Solved: </span>
                      {s.problemsSolved.join(", ")}
                    </p>
                  )}
                  {s.language && (
                    <p className="mb-2">
                      <span className="text-text-secondary">Language: </span>
                      {s.language}
                    </p>
                  )}
                  {s.summary && (
                    <div className="mt-3 rounded-lg bg-bg-tertiary p-3">
                      <p className="mb-1 text-xs font-semibold text-text-secondary">AI Summary</p>
                      <p className="whitespace-pre-wrap">{s.summary}</p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-text-secondary">
                    Replay: session data stored — rejoin room to continue
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
