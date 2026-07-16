import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { Bookmark } from "../types";
import { Button, Card, Input } from "../components/ui";
import { useToast } from "../components/ui/Toast";

const KINDS = ["FAVORITE", "REVISION", "COLLECTION"] as const;

export function BookmarksPage() {
  const { pushToast } = useToast();
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<(typeof KINDS)[number]>("FAVORITE");
  const [collection, setCollection] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const load = () => {
    api
      .getBookmarks()
      .then(setBookmarks)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!title.trim()) return;
    try {
      await api.createBookmark({
        title: title.trim(),
        kind,
        collection: kind === "COLLECTION" ? collection || "My Collection" : undefined,
      });
      setTitle("");
      pushToast("Bookmark created", "success");
      load();
    } catch (err) {
      pushToast((err as Error).message, "error");
    }
  };

  const remove = async (id: string) => {
    await api.deleteBookmark(id);
    pushToast("Bookmark removed", "info");
    load();
  };

  const filtered =
    filter === "all" ? bookmarks : bookmarks.filter((b) => b.kind === filter);

  const collections = [...new Set(bookmarks.filter((b) => b.collection).map((b) => b.collection!))];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Bookmarks</h1>
      <p className="mb-6 text-text-secondary">Save problems and sessions for later</p>

      <Card className="mb-6">
        <h3 className="mb-3 font-semibold">Create Bookmark</h3>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
            />
          </div>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
            className="rounded border border-border bg-bg-primary px-3 py-2 text-sm"
          >
            <option value="FAVORITE">Favorite</option>
            <option value="REVISION">Mark for Revision</option>
            <option value="COLLECTION">Collection</option>
          </select>
          {kind === "COLLECTION" && (
            <Input
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="Collection name"
            />
          )}
          <Button onClick={create}>Add</Button>
        </div>
      </Card>

      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...KINDS].map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-lg px-3 py-1.5 text-xs capitalize ${
              filter === k ? "bg-accent text-white" : "bg-bg-tertiary text-text-secondary"
            }`}
          >
            {k === "all" ? "All" : k.toLowerCase().replace("_", " ")}
          </button>
        ))}
      </div>

      {collections.length > 0 && (
        <Card className="mb-6">
          <h3 className="mb-2 font-semibold">Collections</h3>
          <div className="flex flex-wrap gap-2">
            {collections.map((c) => (
              <span key={c} className="rounded-full bg-bg-tertiary px-3 py-1 text-xs">
                {c} ({bookmarks.filter((b) => b.collection === c).length})
              </span>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card>
            <p className="text-text-secondary">No bookmarks yet</p>
          </Card>
        ) : (
          filtered.map((b) => (
            <Card key={b.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{b.title}</p>
                <p className="text-xs text-text-secondary">
                  {b.kind}
                  {b.collection && ` · ${b.collection}`}
                  {b.problemId && (
                    <>
                      {" · "}
                      <Link to={`/problems/${b.problemId}`} className="text-accent hover:underline">
                        Open problem
                      </Link>
                    </>
                  )}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(b.id)}>
                Remove
              </Button>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
