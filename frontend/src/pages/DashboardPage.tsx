import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { Room, Problem, UserProfile } from "../types";
import { Button, Card, DifficultyBadge } from "../components/ui";
import { useAuth } from "../contexts/AuthContext";

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [recentRoom, setRecentRoom] = useState<Room | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<
    { id: string; roomName: string; problemTitle?: string | null; startedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getRecentRoom().catch(() => ({ room: null })),
      api.getProblems().catch(() => []),
      api.getProfile().catch(() => null),
      api.getSessions().catch(() => []),
    ]).then(([recent, probs, prof, sess]) => {
      setRecentRoom(recent.room);
      setProblems(probs.slice(0, 4));
      setProfile(prof);
      setSessions(sess.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  const goalTarget = 5;
  const goalDone = Math.min(goalTarget, profile?.stats.totalSolved || 0);
  const dailyChallenge = problems[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold md:text-3xl">
          Welcome back{user?.username ? `, ${user.username}` : ""}
        </h1>
        <p className="mt-1 text-text-secondary">
          Pick up where you left off — or start something new.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-hover brand-gradient-bg text-white md:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80">Continue Learning</p>
          <h2 className="mt-2 text-xl font-bold">
            {loading
              ? "Loading…"
              : recentRoom
                ? recentRoom.problem.title
                : "No active session"}
          </h2>
          <p className="mt-1 text-sm text-white/80">
            {recentRoom ? `Room ${recentRoom.code}` : "Start a problem to begin collaborating"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="!bg-white !text-accent hover:!bg-white/90"
              disabled={!recentRoom}
              onClick={() => recentRoom && navigate(`/room/${recentRoom.id}`)}
            >
              Continue last session
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="!text-white hover:!bg-white/15"
              onClick={() => navigate("/problems")}
            >
              Browse problems
            </Button>
          </div>
        </Card>

        <Card className="card-hover">
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Today&apos;s Goal</p>
          <p className="mt-2 text-3xl font-bold">
            {goalDone}/{goalTarget}
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-tertiary">
            <div
              className="h-full rounded-full brand-gradient-bg transition-all"
              style={{ width: `${(goalDone / goalTarget) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Streak {profile?.stats.currentStreak ?? 0} days · Weekly goal on track
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-hover lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Daily Challenge</h3>
            <DifficultyBadge difficulty={dailyChallenge?.difficulty || "EASY"} />
          </div>
          {dailyChallenge ? (
            <>
              <h4 className="text-lg font-medium">{dailyChallenge.title}</h4>
              <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                Warm up with today&apos;s featured problem.
              </p>
              <Button size="sm" className="mt-4" onClick={() => navigate(`/problems/${dailyChallenge.id}`)}>
                Solve challenge
              </Button>
            </>
          ) : (
            <p className="text-sm text-text-secondary">No challenge loaded</p>
          )}
        </Card>

        <Card className="card-hover">
          <h3 className="mb-3 font-semibold">Quick actions</h3>
          <div className="flex flex-col gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate("/join")}>
              Join room
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/friends")}>
              Invite friend
            </Button>
            <Button size="sm" variant="secondary" onClick={() => navigate("/profile")}>
              View profile
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-hover">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recommended Problems</h3>
            <Link to="/problems" className="text-xs text-accent hover:underline">
              See all
            </Link>
          </div>
          <ul className="space-y-2">
            {problems.map((p) => (
              <li key={p.id}>
                <Link
                  to={`/problems/${p.id}`}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm hover:bg-bg-tertiary/50"
                >
                  <span className="font-medium">{p.title}</span>
                  <DifficultyBadge difficulty={p.difficulty} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="card-hover">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">Recent Rooms & Sessions</h3>
            <Link to="/sessions" className="text-xs text-accent hover:underline">
              History
            </Link>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-text-secondary">No sessions yet</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sessions.map((s) => (
                <li key={s.id} className="rounded-lg border border-border px-3 py-2">
                  <p className="font-medium">{s.roomName}</p>
                  <p className="text-xs text-text-secondary">
                    {s.problemTitle || "Session"} · {new Date(s.startedAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4">
            <h4 className="mb-2 text-xs font-medium uppercase text-text-secondary">
              Recent collaborators
            </h4>
            <div className="flex -space-x-2">
              {(profile?.friends || []).slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  title={f.username}
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-bg-secondary bg-accent/20 text-[10px] font-bold text-accent"
                >
                  {f.username[0].toUpperCase()}
                </div>
              ))}
              {!profile?.friends?.length && (
                <p className="text-xs text-text-secondary">Collaborate to meet others</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card className="card-hover">
        <h3 className="mb-2 font-semibold">Upcoming study sessions</h3>
        <p className="text-sm text-text-secondary">
          {profile?.contests.upcoming[0]
            ? `${profile.contests.upcoming[0].name} — ${new Date(profile.contests.upcoming[0].startsAt).toLocaleString()}`
            : "No upcoming contests. Check the leaderboard and keep practicing!"}
        </p>
      </Card>
    </div>
  );
}
