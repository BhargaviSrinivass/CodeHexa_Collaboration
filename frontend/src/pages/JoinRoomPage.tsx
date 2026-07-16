import { useState, FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../services/api";
import { Button, Input, Card } from "../components/ui";

export function JoinRoomPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get("code") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    setLoading(true);
    try {
      const room = await api.joinRoom(code.trim());
      navigate(`/room/${room.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="mb-2 text-2xl font-bold">Join Room</h1>
      <p className="mb-8 text-text-secondary">
        Enter a room code or paste an invite link code
      </p>

      <Card className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</div>
          )}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Room Code</label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              className="font-mono text-lg tracking-widest"
              maxLength={20}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
            {loading ? "Joining..." : "Join Room"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
