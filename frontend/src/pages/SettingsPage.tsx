import { useEffect, useState } from "react";
import { api } from "../services/api";
import { UserSettings } from "../types";
import { Button, Card, Input } from "../components/ui";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../components/ui/Toast";

export function SettingsPage() {
  const { setTheme, refreshSettings } = useTheme();
  const { pushToast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getSettings()
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      setTheme(updated.theme);
      await refreshSettings();
      pushToast("Settings saved", "success");
    } catch (err) {
      pushToast((err as Error).message, "error");
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  if (loading || !settings) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <h1 className="mb-2 text-2xl font-bold">Settings</h1>
      <p className="mb-6 text-text-secondary">Customize your experience</p>

      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <h3 className="mb-4 font-semibold">Appearance</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-text-secondary">Theme</label>
              <div className="flex flex-wrap gap-2">
                {(["dark", "light", "system"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => update("theme", t)}
                    className={`rounded-lg px-4 py-2 text-sm capitalize ${
                      settings.theme === t
                        ? "bg-accent text-white"
                        : "bg-bg-tertiary text-text-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Editor Font</label>
              <Input
                value={settings.editorFont}
                onChange={(e) => update("editorFont", e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">
                Font Size ({settings.fontSize}px)
              </label>
              <input
                type="range"
                min={10}
                max={28}
                value={settings.fontSize}
                onChange={(e) => update("fontSize", Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-text-secondary">Preferred Language</label>
              <select
                value={settings.preferredLanguage}
                onChange={(e) => update("preferredLanguage", e.target.value)}
                className="w-full rounded border border-border bg-bg-primary px-3 py-2 text-sm"
              >
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Notifications</h3>
          <div className="space-y-3">
            {(
              [
                ["notifyJoins", "Room joins & leaves"],
                ["notifyMentions", "Mentions & messages"],
                ["notifyFriendRequests", "Friend requests"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <input
                  type="checkbox"
                  checked={settings[key]}
                  onChange={(e) => update(key, e.target.checked)}
                  className="h-4 w-4 accent-accent"
                />
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Privacy & Voice</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Show online status to friends</span>
              <input
                type="checkbox"
                checked={settings.privacyShowOnline}
                onChange={(e) => update("privacyShowOnline", e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm">Auto-join voice when entering a room</span>
              <input
                type="checkbox"
                checked={settings.autoJoinVoice}
                onChange={(e) => update("autoJoinVoice", e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Account & Privacy</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>Email verification and password reset are available via auth APIs.</li>
            <li>JWT refresh tokens rotate on each refresh request.</li>
            <li>Rate limiting and Helmet protect all API routes.</li>
          </ul>
          <p className="mt-3 text-xs text-text-secondary">
            Edit public profile fields on the{" "}
            <a href="/profile" className="text-accent hover:underline">
              Profile
            </a>{" "}
            page.
          </p>
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">Accessibility</h3>
          <p className="text-sm text-text-secondary">
            Prefer system theme for OS-level contrast. Increase editor font size above for readability.
          </p>
        </Card>

        <Card>
          <h3 className="mb-2 font-semibold">Keyboard Shortcuts</h3>
          <ul className="space-y-1 text-sm text-text-secondary">
            <li><kbd className="rounded bg-bg-tertiary px-1.5 py-0.5">Ctrl+Enter</kbd> Run tests</li>
            <li><kbd className="rounded bg-bg-tertiary px-1.5 py-0.5">Ctrl+/</kbd> Toggle comment</li>
            <li><kbd className="rounded bg-bg-tertiary px-1.5 py-0.5">Ctrl+S</kbd> Format code</li>
          </ul>
        </Card>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
