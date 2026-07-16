import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { GlobalSearchResult } from "../types";
import { Button, Card, Input } from "../components/ui";

export function SearchPage() {
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || "");
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (q = query) => {
    if (q.trim().length < 2) return;
    setLoading(true);
    try {
      const data = await api.globalSearch(q.trim());
      setResults(data);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = params.get("q");
    if (q) {
      setQuery(q);
      search(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Search</h1>
      <p className="mb-6 text-text-secondary">
        Find problems, users, rooms, messages, and sessions
      </p>

      <div className="mb-8 flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search anything…"
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <Button onClick={() => search()} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </div>

      {results && (
        <div className="grid gap-6 md:grid-cols-2">
          <SearchSection title="Problems" count={results.problems.length}>
            {results.problems.map((p) => (
              <Link
                key={p.id}
                to={`/problems/${p.id}`}
                className="block rounded-lg border border-border p-3 hover:bg-bg-tertiary/40"
              >
                <p className="font-medium">{p.title}</p>
                <p className="text-xs text-text-secondary">{p.difficulty}</p>
              </Link>
            ))}
          </SearchSection>

          <SearchSection title="Users" count={results.users.length}>
            {results.users.map((u) => (
              <div key={u.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{u.username}</p>
                <p className="text-xs text-text-secondary">
                  Active {new Date(u.lastActiveAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </SearchSection>

          <SearchSection title="Rooms" count={results.rooms.length}>
            {results.rooms.map((r) => (
              <Link
                key={r.id}
                to={`/room/${r.id}`}
                className="block rounded-lg border border-border p-3 hover:bg-bg-tertiary/40"
              >
                <p className="font-medium">{r.name}</p>
                <p className="font-mono text-xs text-text-secondary">{r.code}</p>
              </Link>
            ))}
          </SearchSection>

          <SearchSection title="Messages" count={results.messages.length}>
            {results.messages.map((m) => (
              <div key={m.id} className="rounded-lg border border-border p-3">
                <p className="text-sm">{m.content.slice(0, 120)}</p>
                <p className="text-xs text-text-secondary">
                  {m.user.username} in {m.room.name}
                </p>
              </div>
            ))}
          </SearchSection>

          <SearchSection title="Sessions" count={results.sessions.length}>
            {results.sessions.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{s.roomName}</p>
                <p className="text-xs text-text-secondary">
                  {s.problemTitle} · {new Date(s.startedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </SearchSection>
        </div>
      )}
    </div>
  );
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <h3 className="mb-3 font-semibold">
        {title} {count > 0 && <span className="text-text-secondary">({count})</span>}
      </h3>
      {count === 0 ? (
        <p className="text-sm text-text-secondary">No results</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </Card>
  );
}
