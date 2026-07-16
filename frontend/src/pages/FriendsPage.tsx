import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import { FriendUser, PendingFriendRequest } from "../types";
import { Button, Card, Input } from "../components/ui";
import { useToast } from "../components/ui/Toast";

export function FriendsPage() {
  const { pushToast } = useToast();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pending, setPending] = useState<PendingFriendRequest[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; username: string; email: string; lastActiveAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.getFriends();
      setFriends(data.friends);
      setPending(data.pending);
    } catch {
      pushToast("Failed to load friends", "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    load();
  }, [load]);

  const search = async () => {
    if (query.trim().length < 2) return;
    const users = await api.searchUsers(query.trim());
    setResults(users);
  };

  const sendRequest = async (userId: string) => {
    try {
      await api.sendFriendRequest(userId);
      pushToast("Friend request sent", "success");
      setResults((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      pushToast((err as Error).message, "error");
    }
  };

  const respond = async (friendshipId: string, accept: boolean) => {
    try {
      await api.respondFriendRequest(friendshipId, accept);
      pushToast(accept ? "Friend added" : "Request rejected", accept ? "success" : "info");
      load();
    } catch (err) {
      pushToast((err as Error).message, "error");
    }
  };

  const remove = async (friendshipId: string) => {
    try {
      await api.removeFriend(friendshipId);
      pushToast("Friend removed", "info");
      load();
    } catch (err) {
      pushToast((err as Error).message, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Friends</h1>
      <p className="mb-6 text-text-secondary">Connect with other coders</p>

      <Card className="mb-6">
        <h3 className="mb-3 font-semibold">Search Users</h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or email"
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <Button onClick={search}>Search</Button>
        </div>
        {results.length > 0 && (
          <ul className="mt-4 space-y-2">
            {results.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-text-secondary">{u.email}</p>
                </div>
                <Button size="sm" onClick={() => sendRequest(u.id)}>
                  Add Friend
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {pending.length > 0 && (
        <Card className="mb-6">
          <h3 className="mb-3 font-semibold">Pending Requests</h3>
          <ul className="space-y-2">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <span>{p.requester.username}</span>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => respond(p.id, true)}>
                    Accept
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(p.id, false)}>
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h3 className="mb-3 font-semibold">Your Friends ({friends.length})</h3>
        {friends.length === 0 ? (
          <p className="text-sm text-text-secondary">No friends yet — search above to add some</p>
        ) : (
          <ul className="space-y-2">
            {friends.map((f) => (
              <li
                key={f.friendshipId}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium">{f.username}</p>
                  <p className="text-xs text-text-secondary">
                    <span className={f.online ? "text-success" : ""}>
                      {f.online ? "● Online" : "○ Offline"}
                    </span>
                    {!f.online && (
                      <span className="ml-2">
                        Last active {new Date(f.lastActiveAt).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(f.friendshipId)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
