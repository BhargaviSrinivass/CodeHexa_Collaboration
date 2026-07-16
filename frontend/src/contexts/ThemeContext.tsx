import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { api } from "../services/api";
import { useAuth } from "./AuthContext";
import { UserSettings } from "../types";

export type ThemeMode = UserSettings["theme"];

interface ThemeContextType {
  theme: ThemeMode;
  resolved: "dark" | "light";
  setTheme: (t: ThemeMode) => void;
  settings: UserSettings | null;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>(
    () => (localStorage.getItem("theme") as ThemeMode) || "light"
  );
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  const refreshSettings = useCallback(async () => {
    if (!token) return;
    try {
      const s = await api.getSettings();
      setSettings(s);
      setThemeState(s.theme);
      localStorage.setItem("theme", s.theme);
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (token) refreshSettings();
  }, [token, refreshSettings]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const mode = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      setResolved(mode);
      document.documentElement.dataset.theme = mode;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback(
    async (t: ThemeMode) => {
      setThemeState(t);
      localStorage.setItem("theme", t);
      if (token) {
        try {
          const s = await api.updateSettings({ theme: t });
          setSettings(s);
        } catch {
          /* ignore */
        }
      }
    },
    [token]
  );

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme, settings, refreshSettings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
