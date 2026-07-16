import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../services/api";
import { UserProfile } from "../types";
import { Button, Card, Input } from "../components/ui";
import { ActivityHeatmap } from "../components/profile/ActivityHeatmap";
import { CircularProgress } from "../components/profile/CircularProgress";
import { useToast } from "../components/ui/Toast";
import { Logo } from "../components/brand/Logo";

export function ProfilePage() {
  const { pushToast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    bio: "",
    college: "",
    github: "",
    linkedin: "",
  });

  const load = () => {
    api
      .getProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          displayName: p.user.displayName || "",
          bio: p.user.bio || "",
          college: p.user.college || "",
          github: p.user.github || "",
          linkedin: p.user.linkedin || "",
        });
      })
      .catch(() => pushToast("Failed to load profile", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      await api.updateProfile(form);
      pushToast("Profile updated", "success");
      setEditing(false);
      load();
    } catch (err) {
      pushToast((err as Error).message, "error");
    }
  };

  if (loading || !profile) {
    return (
      <div className="space-y-4 p-4 md:p-8">
        <div className="skeleton h-40 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="skeleton h-48" />
          <div className="skeleton h-48" />
          <div className="skeleton h-48" />
        </div>
      </div>
    );
  }

  const { user, stats } = profile;
  const initial = (user.displayName || user.username)[0]?.toUpperCase() || "?";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-2xl border border-border bg-bg-secondary shadow-sm"
      >
        <div className="brand-gradient-bg h-28 md:h-36" />
        <div className="relative px-4 pb-6 md:px-8">
          <div className="-mt-12 mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-2xl border-4 border-bg-secondary object-cover shadow-md"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-bg-secondary bg-accent text-3xl font-bold text-white shadow-md">
                  {initial}
                </div>
              )}
              <div className="pb-1">
                <h1 className="text-2xl font-bold">{user.displayName || user.username}</h1>
                <p className="text-sm text-text-secondary">@{user.username}</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setEditing((v) => !v)}>
              {editing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          {editing ? (
            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <Input
                placeholder="Display name"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
              <Input
                placeholder="College"
                value={form.college}
                onChange={(e) => setForm({ ...form, college: e.target.value })}
              />
              <Input
                placeholder="GitHub URL"
                value={form.github}
                onChange={(e) => setForm({ ...form, github: e.target.value })}
              />
              <Input
                placeholder="LinkedIn URL"
                value={form.linkedin}
                onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
              />
              <textarea
                className="md:col-span-2 min-h-[80px] w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm"
                placeholder="Bio"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
              <Button onClick={save}>Save changes</Button>
            </div>
          ) : (
            <div className="mb-4 space-y-2 text-sm">
              {user.bio && <p className="text-text-primary">{user.bio}</p>}
              <div className="flex flex-wrap gap-3 text-text-secondary">
                {user.college && <span>🎓 {user.college}</span>}
                {user.github && (
                  <a href={user.github} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    GitHub
                  </a>
                )}
                {user.linkedin && (
                  <a href={user.linkedin} target="_blank" rel="noreferrer" className="text-accent-blue hover:underline">
                    LinkedIn
                  </a>
                )}
                <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-sm">
            <div className="rounded-xl bg-bg-tertiary px-4 py-2">
              <span className="text-text-secondary">Collab hours </span>
              <span className="font-semibold">{stats.collaborationHours}h</span>
            </div>
            <div className="rounded-xl bg-bg-tertiary px-4 py-2">
              <span className="text-text-secondary">Rank </span>
              <span className="font-semibold">#{stats.collaborationRank}</span>
            </div>
            <div className="rounded-xl bg-bg-tertiary px-4 py-2">
              <span className="text-text-secondary">Streak </span>
              <span className="font-semibold">{stats.currentStreak}🔥</span>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-hover flex flex-col items-center justify-center">
          <CircularProgress
            easy={stats.solvedEasy}
            medium={stats.solvedMedium}
            hard={stats.solvedHard}
          />
          <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-semibold text-success">{stats.solvedEasy}</p>
              <p className="text-text-secondary">Easy</p>
            </div>
            <div>
              <p className="font-semibold text-warning">{stats.solvedMedium}</p>
              <p className="text-text-secondary">Medium</p>
            </div>
            <div>
              <p className="font-semibold text-error">{stats.solvedHard}</p>
              <p className="text-text-secondary">Hard</p>
            </div>
          </div>
        </Card>

        <Card className="card-hover lg:col-span-2">
          <h3 className="mb-4 font-semibold">Coding Statistics</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {[
              ["Attempted", stats.attempted],
              ["Acceptance", `${stats.acceptanceRate}%`],
              ["Submissions", stats.totalSubmissions],
              ["Successful", stats.successfulSubs],
              ["Current Streak", stats.currentStreak],
              ["Longest Streak", stats.longestStreak],
              ["Collab Score", stats.collaborationScore],
              ["AI Score", stats.aiLearningScore],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl bg-bg-tertiary/60 p-3">
                <p className="text-xs text-text-secondary">{label}</p>
                <p className="mt-1 text-lg font-bold">{value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="card-hover">
        <ActivityHeatmap data={profile.heatmap} />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-hover">
          <h3 className="mb-4 font-semibold">Badges & Achievements</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.badges.map((b) => (
              <motion.div
                key={b.id}
                whileHover={{ scale: b.unlocked ? 1.03 : 1 }}
                className={`rounded-xl border p-3 text-center transition-all ${
                  b.unlocked
                    ? "border-accent/30 bg-accent/5 shadow-sm"
                    : "border-border bg-bg-tertiary/40 opacity-50 grayscale"
                }`}
              >
                <div className="mb-1 text-2xl">{b.icon}</div>
                <p className="text-xs font-semibold">{b.name}</p>
                <p className="mt-0.5 text-[10px] text-text-secondary">{b.description}</p>
                {!b.unlocked && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-bg-tertiary">
                    <div className="h-full w-1/3 rounded-full brand-gradient-bg" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="card-hover">
          <h3 className="mb-4 font-semibold">Languages</h3>
          <div className="space-y-3">
            {Object.entries(profile.languageStats).map(([lang, count]) => {
              const max = Math.max(1, ...Object.values(profile.languageStats));
              return (
                <div key={lang}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="capitalize">{lang}</span>
                    <span className="text-text-secondary">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                    <div
                      className="h-full rounded-full brand-gradient-bg transition-all"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-text-secondary">
            Favorite: <span className="font-medium capitalize">{stats.favoriteLanguage}</span> ·
            Top topic: {stats.mostSolvedTopic}
          </p>
        </Card>
      </div>

      <Card className="card-hover">
        <h3 className="mb-4 font-semibold">Topic Progress</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {profile.topicProgress.map((t) => (
            <div key={t.topic}>
              <div className="mb-1 flex justify-between text-sm">
                <span>{t.topic}</span>
                <span className="text-text-secondary">
                  {t.solved}/{t.total}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className="h-full rounded-full bg-accent-blue transition-all"
                  style={{ width: `${Math.min(100, (t.solved / t.total) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="card-hover">
          <h3 className="mb-4 font-semibold">Contest History</h3>
          <p className="mb-2 text-xs font-medium uppercase text-text-secondary">Upcoming</p>
          {profile.contests.upcoming.map((c) => (
            <div key={c.id} className="mb-2 rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-text-secondary">
                {new Date(c.startsAt).toLocaleString()} · {c.participants} registered
              </p>
            </div>
          ))}
          <p className="mb-2 mt-4 text-xs font-medium uppercase text-text-secondary">Completed</p>
          {profile.contests.completed.map((c) => (
            <div key={c.id} className="mb-2 rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{c.name}</p>
              <p className="text-xs text-text-secondary">
                Rank #{c.rank} · Rating {c.rating}
              </p>
            </div>
          ))}
        </Card>

        <Card className="card-hover">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Friends</h3>
            <Link to="/friends" className="text-xs text-accent hover:underline">
              Manage
            </Link>
          </div>
          {profile.friends.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No friends yet —{" "}
              <Link to="/friends" className="text-accent hover:underline">
                invite someone
              </Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {profile.friends.slice(0, 8).map((f) => (
                <li key={f.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-bg-tertiary/50">
                  <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {f.username[0].toUpperCase()}
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-secondary ${
                        f.online ? "bg-success" : "bg-text-secondary"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.username}</p>
                    <p className="text-[10px] text-text-secondary">
                      {f.online ? "Online" : "Offline"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
            <Logo size={20} showText={false} />
            <p className="text-xs text-text-secondary">CodeHexa · Where code meets collaboration</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
